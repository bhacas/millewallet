<?php
// fetch_magic_link.php
// composer require google/apiclient:^2.17
// Pliki obok: credentials.json (z GCP), token.json (utworzy się po 1. autoryzacji)

require __DIR__ . '/vendor/autoload.php';

use Google\Client as GoogleClient;
use Google\Service\Gmail;
use Google\Service\Gmail\MessagePart;

/** ---- AUTH ---- */
function getClient(): GoogleClient {
    $client = new GoogleClient();
    $client->setApplicationName('BudgetBakers Magic Link');
    $client->setScopes([Gmail::GMAIL_READONLY]);
    $client->setAuthConfig(__DIR__ . '/credentials.json');
    $client->setAccessType('offline');
    $client->setPrompt('consent');

    $tokenPath = __DIR__ . '/token.json';
    if (is_file($tokenPath)) {
        $client->setAccessToken(json_decode(file_get_contents($tokenPath), true));
    }

    if ($client->isAccessTokenExpired()) {
        if ($client->getRefreshToken()) {
            $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
        } else {
            $authUrl = $client->createAuthUrl();
            fwrite(STDERR, "Otwórz w przeglądarce:\n$authUrl\n\nWklej tutaj kod autoryzacji: ");
            $authCode = trim(fgets(STDIN));
            $tokens = $client->fetchAccessTokenWithAuthCode($authCode);
            if (isset($tokens['error'])) {
                throw new RuntimeException('OAuth error: ' . ($tokens['error_description'] ?? $tokens['error']));
            }
            $client->setAccessToken($tokens);
        }
        file_put_contents($tokenPath, json_encode($client->getAccessToken(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    return $client;
}

/** base64url decode (z uzupełnieniem paddingu) */
function decodeB64Url(?string $data): string {
    if (!$data) return '';
    $data = strtr($data, '-_', '+/');
    $pad = strlen($data) % 4;
    if ($pad) $data .= str_repeat('=', 4 - $pad);
    return base64_decode($data) ?: '';
}

/** ---- PARSOWANIE TREŚCI WIADOMOŚCI (obiekty Gmail SDK) ---- */
function extractBodyFromPayload(MessagePart $payload): string {
    $all = '';
    $stack = [$payload];

    while ($stack) {
        /** @var MessagePart $p */
        $p = array_pop($stack);

        // dzieci (multipart/alternative, itd.)
        if ($p->getParts()) {
            foreach ($p->getParts() as $child) {
                $stack[] = $child;
            }
        }

        $mime = strtolower($p->getMimeType() ?? '');
        $body = $p->getBody();
        $data = $body ? $body->getData() : null;

        if ($data && ($mime === 'text/plain' || $mime === 'text/html')) {
            $all .= "\n" . decodeB64Url($data);
        }
    }

    // fallback – czasem całość jest w korzeniu bez parts
    if (!$all && $payload->getBody() && $payload->getBody()->getData()) {
        $all = decodeB64Url($payload->getBody()->getData());
    }

    return $all;
}

/** Znajdź link do BudgetBakers w tekście/HTML */
function findMagicLink(string $text): ?string {
    if (!$text) return null;

    if (preg_match_all('#https?://[^\s"\'<>]+#i', $text, $m)) {
        foreach ($m[0] as $raw) {
            $url = rtrim($raw, ".,);\"'>"); // odetnij przypadkowe ogonki
            if (preg_match('#(?:^|//)(?:[^/]*\.)?budgetbakers\.com#i', $url)) {
                return $url;
            }
        }
    }
    return null;
}

/** Pobierz najnowszy magic link */
function fetchLatestMagicLink(Gmail $gmail, string $query=''): ?string {
    // dostosuj w razie potrzeby filtr
    $q = $query ?: 'from:(budgetbakers.com OR budgetbakers.info) newer_than:1m';
    $list = $gmail->users_messages->listUsersMessages('me', ['q' => $q, 'maxResults' => 10]);
    $msgs = $list->getMessages();
    if (!$msgs) return null;

    foreach ($msgs as $m) {
        $msg = $gmail->users_messages->get('me', $m->getId(), ['format' => 'full']);
        $payload = $msg->getPayload(); // <-- to jest MessagePart (obiekt)
        $body = extractBodyFromPayload($payload);
        $url = findMagicLink($body);
        if ($url) return $url;
    }
    return null;
}

/** ---- MAIN ---- */
try {
    sleep(15);
    $client = getClient();
    $gmail  = new Gmail($client);

    $query = getenv('BB_GMAIL_QUERY') ?: ''; // można nadpisać własnym zapytaniem Gmail
    $link  = fetchLatestMagicLink($gmail, $query);

    if (!$link) {
        fwrite(STDERR, "Nie znaleziono magic linka.\n");
        exit(2);
    }

    echo "MAGIC_LINK={$link}\n";
    exit(0);
} catch (Throwable $e) {
    fwrite(STDERR, "Błąd: " . $e->getMessage() . PHP_EOL);
    exit(1);
}

# THE BOYZ — Scans Archive

Statyczne archiwum skanów przygotowane do publikacji przez GitHub Pages. Zawartość jest pobierana z publicznego folderu Google Drive, natomiast obrazy nie są kopiowane do repozytorium — strona używa miniaturek i linków Drive. Dzięki temu repozytorium pozostaje małe.

## Pierwsze uruchomienie na GitHubie

1. Utwórz nowe repozytorium i wgraj do niego całą zawartość tego folderu.
2. Wejdź w `Settings → Secrets and variables → Actions → New repository secret`.
3. Dodaj sekret o nazwie `GOOGLE_DRIVE_API_KEY` i wklej swój klucz Google Drive API.
4. Klucz powinien mieć w Google Cloud ograniczenie API wyłącznie do `Google Drive API`. Ponieważ zapytania wykonuje GitHub Actions, nie ustawiaj ograniczenia typu `Websites`.
5. Wejdź w `Settings → Pages` i w polu `Source` wybierz `GitHub Actions`.
6. Otwórz `Actions → Update Scans archive → Run workflow`, aby wykonać pierwszą synchronizację i publikację.

## Automatyczna aktualizacja

Workflow `.github/workflows/update-scans.yml` uruchamia się codziennie o `03:17 UTC` i `15:17 UTC`, czyli dokładnie co 12 godzin. Sprawdza całe drzewo folderów, aktualizuje `data.js`, automatycznie tworzy podstrony dla nowych folderów głównych, zapisuje zmiany w repozytorium i publikuje GitHub Pages.

W Polsce odpowiada to zwykle godzinom 05:17 i 17:17 latem oraz 04:17 i 16:17 zimą.

## Struktura danych

- Pierwszy poziom folderów Drive tworzy podstrony widoczne na stronie głównej.
- Drugi poziom tworzy karty galerii.
- Dalsze podfoldery tworzą sekcje wewnątrz otwartej galerii.
- Pliki PDF pojawiają się jako osobne odnośniki w podglądzie galerii.
- Każdy skan ma link `VIEW` oraz `DOWNLOAD` do oryginalnego pliku w Google Drive.

Nie edytuj ręcznie `data.js` ani wygenerowanych folderów podstron — zostaną nadpisane przy kolejnej synchronizacji. Wygląd strony można zmieniać w `styles.css`, a zachowanie w `landing.js` i `gallery.js`.

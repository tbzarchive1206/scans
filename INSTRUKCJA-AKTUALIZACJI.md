# Jak dodawać nowe skany

1. Otwórz źródłowy folder `SCANS ARCHIVE` na Google Drive.
2. Dodaj pliki do odpowiedniego podfolderu. Obrazy mogą mieć dowolne nazwy, ale najlepiej numerować je kolejno, np. `001.jpg`, `002.jpg`.
3. Jeżeli tworzysz nowy folder na pierwszym poziomie, strona utworzy dla niego nową podstronę.
4. Jeżeli tworzysz folder wewnątrz jednej z siedmiu kolekcji, pojawi się jako galeria lub sekcja galerii — zgodnie z poziomem zagnieżdżenia.
5. Zaczekaj na automatyczną synchronizację (odbywa się dwa razy dziennie) albo uruchom ją ręcznie przez `Actions → Update Scans archive → Run workflow`.
6. Po zakończeniu workflow ze statusem `Success` odśwież stronę GitHub Pages. Czasem aktualizacja Pages potrzebuje dodatkowej minuty.

Folder oraz pliki muszą pozostać publicznie dostępne dla osób posiadających link. Nie dodawaj klucza API bezpośrednio do żadnego pliku w repozytorium — przechowuj go wyłącznie jako sekret `GOOGLE_DRIVE_API_KEY`.

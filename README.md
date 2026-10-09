# Studieforbundskutt-data

Data til Konsekvenskartet (Vofo), statsbudsjettet 2027.

- `nyheter.json`: mediesaker om kuttet i studieforbundene, oppdateres av Budsjettkampradaren hver hverdag morgen.
- `historier.json`: læringshistorier fra vofo.no med sted og koordinater.

vofo.no/kart henter filene direkte fra
https://raw.githubusercontent.com/Stianjuell/Studieforbundskutt-data/main/nyheter.json
og
https://raw.githubusercontent.com/Stianjuell/Studieforbundskutt-data/main/historier.json

`side/vofo.html` er selve Konsekvenskartet. vofo.no/kart er en liten laster som henter denne filen, så endringer i utseende og tekst publiseres ved å oppdatere den.

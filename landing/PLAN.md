# Traccia – Landing page whitelist

Il pacchetto vive in `landing/` e viene pubblicato su GitHub Pages insieme al pannello coach: https://grillia.github.io/workoutPlanner/landing/ (l'app resta su https://grillia.github.io/workoutPlanner/). Avvio locale: `npm install && npm run dev`.

Le note sotto sono il piano del prototipo (scelte di stile, form, backend whitelist). L'hosting scelto per il repo è GitHub Pages, non Cloudflare.

## Stile (v2, 17/10/2026)
La pagina segue il tema **Sole** dell'app (PR #83, analisi in `APP-STYLE.md`): sfondo crema `#FFF8F1`, card bianche con ombra morbida, arancio `#FF7A45` solo come riempimento con testo cacao `#231A14`, indaco `#3B3F9E` per i dati, Plus Jakarta Sans (servito in locale con `@fontsource`, quindi nessuna chiamata a Google Fonts, meglio per il GDPR), bottoni e chip a pillola, testi in sentence case, logo "tracci**a**". La prima versione, scura con accento lime, è in `shot-*-v1.png`; la v2 (Sole con il robot) è in `shot-*-v2.png`. La v3 (attuale) segue la PR #84: niente mascotte, "Termina allenamento" come pill flottante.

## Struttura della pagina
1. **Nav**: logo TRACCIA, link alle sezioni, pulsante "Accesso anticipato".
2. **Hero**: "Oggi tocca a te. La scheda è già nel telefono." + form whitelist (email, ruolo coach/atleta, consenso GDPR) + mockup della Home Sole (card arancio "Oggi tocca a", tab bar a pillola).
3. **Funzioni** (4 blocchi presi dal repo): pannello coach web (KPI, stati scheda, "Nuova scheda") · allenamento una serie alla volta (peso, ripetizioni, RIR, recupero consigliato) · offline (schermata arancio "Allenamento fatto!") · Progressi (card indaco con barre, record, giorni di fila).
4. **Come funziona**: il coach crea la scheda → l'atleta riscatta l'invito → ci si allena e i dati arrivano al coach.
5. **Vantaggi early access** (*proposte*): badge Fondatore, 3 mesi gratis per i coach + prezzo bloccato, accesso al test chiuso. Banner "Salta la fila".
6. **FAQ** (6 domande), **CTA finale** con secondo form, **footer** con una riga privacy breve (niente placeholder).

## Form
- `action` = `PUBLIC_WAITLIST_ENDPOINT` (vedi `.env.example`). Se non è impostato, il form mostra un esito demo.
- Campi: `email`, `role` (coach/atleta), `consent` (obbligatorio), `ref` (letto da `?ref=` per il referral), honeypot `company` contro i bot.
- Da fare prima di raccogliere dati veri: double opt-in, informativa privacy completa, titolare del trattamento reale.

## Backend whitelist: opzioni
| Opzione | Pro | Contro |
|---|---|---|
| **Supabase** (tabella `waitlist` + Edge Function) | Gratis all'inizio, dati tuoi in Postgres (stesso mondo del vostro stack Drizzle/Postgres), referral e classifica facili da fare con SQL, server EU disponibili | Le email (conferma, lancio) vanno gestite a parte, ci vuole un po' di codice e un controllo anti-spam |
| **Brevo** | Azienda UE (GDPR semplice), double opt-in incluso, piano gratis generoso (300 email/giorno), form e API | Referral da costruire a parte, interfaccia un po' pesante |
| **MailerLite** | Semplice, piano gratis per poche centinaia di iscritti (limite da verificare), double opt-in, gruppi coach/atleta | Referral non nativo, l'approvazione dell'account a volte è lenta |
| **Loops** | Moderno, pensato per le startup, ottima API, email belle | Server USA, piano gratis limitato, meno adatto al mercato italiano |
| **Buttondown** | Minimale, ottimo per una newsletter di aggiornamenti sullo sviluppo | Poco adatto a segmentazione e referral |
| **Netlify / Vercel Forms** | Zero codice, basta un attributo sul form | Nessuna email automatica né referral, export manuale, ti lega all'host |

**Consiglio:** **Supabase per la lista + Brevo per le email.** Il form fa un POST a una Edge Function, che salva email, ruolo, `ref` e `ref_code` nella tabella e aggiunge il contatto a Brevo per il double opt-in e la mail di lancio. Se vuoi qualcosa online in un'ora senza codice, parti solo con Brevo (form + API) e aggiungi Supabase quando attivi il referral.

## Hosting
- **Cloudflare Pages** (consigliato): gratis, banda illimitata, CDN veloce in Italia, dominio e DNS nello stesso posto.
- **Vercel**: deploy da Git molto comodo, anteprima per ogni PR. Il piano gratis è per uso non commerciale.
- **Netlify**: simile a Vercel, ha i Forms integrati (utili come piano B).
Tutti e tre leggono il build Astro statico (`dist/`) senza configurazioni particolari.

## Referral "Salta la fila"
- Dopo l'iscrizione: pagina di grazie con la posizione in coda e un link personale `traccia.it/?ref=ABC123` (pulsanti WhatsApp/Instagram).
- Ogni iscritto confermato che arriva dal tuo link ti fa salire di N posizioni. Con 3 inviti entri nel primo gruppo della beta, con 10 ottieni il badge Fondatore (soglie da decidere).
- Lato dati: colonne `ref_code` e `referred_by`, con la posizione calcolata dalla data di iscrizione meno i bonus. Si contano solo le email confermate (double opt-in) per evitare iscrizioni finte.
- Per i coach conviene una variante: "invita 3 colleghi PT → 6 mesi gratis".

## Prossimi passi
1. Scegliere nome e dominio definitivi (Traccia? workoutPlanner?) e comprarlo.
2. Quando il repo rigenera `docs/screenshots` (oggi mostrano ancora il robot, rimosso nella #84), valutare se sostituire i mockup CSS con gli screenshot reali.
3. Creare la tabella Supabase + Edge Function e l'account Brevo, poi impostare `PUBLIC_WAITLIST_ENDPOINT`.
4. Scrivere l'informativa privacy completa e la cookie policy (oggi non ci sono cookie: ideale, così niente banner).
5. Pagina di grazie con il referral, poi deploy su Cloudflare Pages.
6. Analytics senza cookie (Plausible o Cloudflare Web Analytics) e test A/B del titolo (coach contro atleta).
7. Confermare con il commercialista le offerte (mesi gratis, prezzo bloccato) prima di prometterle pubblicamente.

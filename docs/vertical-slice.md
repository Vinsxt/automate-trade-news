# India solar import pilot

The first runnable workflow tracks India (reporter 699) imports of HS 854142
(photovoltaic cells not assembled in modules or panels) from partner markets.
The dashboard uses annual UN Comtrade primary trade values and shows supplier
shares against the source's world-total partner row. Supplier share changes are
percentage-point differences between consecutive years.

## Local setup

1. Keep runtime credentials in the ignored `.env.local` file. The project URL
   is `https://alzxdovziyskmhqnrtfw.supabase.co`. The application needs
   `SUPABASE_SERVICE_ROLE_KEY` for server-side reads and writes; do not expose
   that key in client code or commit the file.
2. `INGEST_ADMIN_TOKEN` is generated in `.env.local`. Use its value in the
   password field on the dashboard when importing a year.
3. `COMTRADE_API_KEY` is optional for the public preview endpoint used by this
   pilot.
4. Restart the development server after changing environment variables, then
   run `npm run dev` and open `http://localhost:3000`.
5. Import one year at a time from Data operations. The page refreshes after a
   successful import and shows the stored data, latest run, supplier ranking,
   market share, and available comparisons.
6. Set `GEMINI_API_KEY` in `.env.local` to enable explanations. Enter the same
   local admin token and choose **Explain latest market data** to summarize the
   latest stored period. Each explanation is generated on request.

## Checks

Run `npm test` for the normalization, ingestion validation, and analytics unit
tests. `npm run typecheck` and `npm run lint` check the application code.
The route tests cover authorization, request validation, selected-period
metrics, and the analysis response contract. A live import should be exercised
one year at a time because the public Comtrade preview can be rate-limited.

## Interpretation limits

- Missing values and absent partner rows are not treated as zero.
- Year-over-year and share-change comparisons require consecutive years.
- Trade value is a value measure, not physical volume or evidence of causation.
- Partner names use a small pilot mapping when the source response omits names;
  otherwise the dashboard shows the partner code.
- The public preview may be rate-limited. Import one year per request and retry
  later if UN Comtrade returns a rate-limit response.
- Gemini explanations describe calculated values; they do not establish causes
  or predict commercial outcomes.

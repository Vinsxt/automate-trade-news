# India solar import pilot

The first runnable workflow tracks India (reporter 699) imports of HS 854142
(photovoltaic cells not assembled in modules or panels) from partner markets.
The dashboard uses annual UN Comtrade HS 2022 (H6) primary trade values and shows supplier
shares against the source's world-total partner row. Supplier share changes are
percentage-point differences between consecutive years.

## Local setup

1. Configure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the
   ignored `.env.local` file. Keep the service-role key server-side.
2. `INGEST_ADMIN_TOKEN` is generated in `.env.local`. Use its value in the
   password field on the dashboard when importing a year.
3. `COMTRADE_API_KEY` is optional for the public preview endpoint used by this
   pilot.
4. Restart the development server after changing environment variables, then
   run `npm run dev` and open `http://localhost:3000`.
5. Apply the product, market, and year filters. The initial catalog contains
   India and HS 854142. The supplier table shows the latest year in the selected
   range. Year-over-year changes use the preceding calendar year where available,
   even when it falls outside the displayed range.
6. Import one year at a time from Data operations. The page refreshes after a
   successful import.
7. Set `GEMINI_API_KEY` in `.env.local` to enable explanations. Enter the same
   local admin token and choose **Explain market data** for the displayed year.
   The request sends bounded trade evidence to Gemini, which selects the
   findings. The server renders the figures from the original evidence.

## Checks

Run `npm test` for the normalization, ingestion validation, and analytics unit
tests. `npm run typecheck` and `npm run lint` check the application code.
The route tests cover authorization, request validation, selected-period
metrics, and the analysis response contract. A live import should be exercised
one year at a time because the public Comtrade preview can be rate-limited.

## Interpretation limits

- Missing values and absent partner rows are not treated as zero.
- Year-over-year and share-change comparisons require consecutive years.
- Movement flags use absolute thresholds of 20% for total import value and five
  percentage points for supplier share. The thresholds are defined in the analytics module.
- Trade value is a value measure, not physical volume or evidence of causation.
- Partner names use a small pilot mapping when the source response omits names;
  otherwise the dashboard shows the partner code.
- The public preview may be rate-limited. Import one year per request and retry
  later if UN Comtrade returns a rate-limit response.
- Gemini explanations describe calculated values; they do not establish causes
  or predict commercial outcomes.

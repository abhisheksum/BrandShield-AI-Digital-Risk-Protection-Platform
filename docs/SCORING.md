# Detection and scoring

Names are case folded, NFKD normalized, stripped of accents, mapped for common visual confusions (`0/o`, `1/l`, `3/e`, `5/s`, `rn/m`, `vv/w`), and punctuation/spacing normalized. RapidFuzz compares brand names and aliases with candidate names. Evidence tags identify one-character substitutions, insertions, deletions, transpositions, spacing variants, added terms, and embedded brand names. Description overlap uses token-set similarity.

Observed signal maxima are 30 points for name, 15 for description, and 20 for publisher comparison. Added brand terms add an observed signal up to 10 points. Logo comparison is not implemented and unavailable data earns no points. The returned normalized score is `100 × observed points / evaluated maximum points` and is explicitly a heuristic.

Priority bands are low (0–39), medium (40–69), and high (70–100). A meaningful name match is required to flag a candidate; names shorter than four normalized characters use a stronger 75% similarity threshold. High requires at least two positive signal types. Publisher mismatch is weak evidence. Exact official account or app identifiers are excluded before scoring. Insufficient evaluated evidence produces no score.

The current implementation is intentionally an MVP: signals and reasons are deterministic, but the weights and thresholds need calibration against a curated evaluation set before operational use.

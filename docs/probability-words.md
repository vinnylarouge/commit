# Words of estimative probability

Reference for the math-lite ("simple") presentation: which words to use for a probability, and which to avoid. Numbers below are re-read from the source artefacts named, not from prose about them (studio rule). Vincent asked for this on 2026-09-12.

## The problem

Sherman Kent (CIA, 1964) found that analysts who all signed off on "serious possibility" privately meant anything from 20% to 80%. Every census since reproduces the spread. A word alone is not a number, so the app pairs the number with the word (SPEC.md section 25: never meaning by colour alone; the same rule for words).

## 1. Prescriptive scales (what institutions tell writers to mean)

**Kent 1964** (CIA, "Words of Estimative Probability"; via Wikipedia's transcription):

| word | point | give or take |
|---|---|---|
| certain | 100% | 0 |
| almost certain | 93% | ±6 |
| probable | 75% | ±12 |
| chances about even | 50% | ±10 |
| probably not | 30% | ±10 |
| almost certainly not | 7% | ±5 |
| impossible | 0% | 0 |

**UK PHIA probability yardstick** (Professional Head of Intelligence Assessment; gov.uk "Explaining uncertainty in UK intelligence assessment"). Deliberate gaps between bands so a judgement is never read as precise:

| term | range |
|---|---|
| remote chance | >0% to ≈5% |
| highly unlikely | ≈10% to ≈20% |
| unlikely | ≈25% to ≈35% |
| realistic possibility | ≈40% to <50% |
| likely or probable | ≈55% to ≈75% |
| highly likely | ≈80% to ≈90% |
| almost certain | ≈95% to <100% |

**US ICD 203** (Intelligence Community Directive 203, Analytic Standards; contiguous bands):

| term | range |
|---|---|
| almost no chance / remote | 1 to 5% |
| very unlikely / highly improbable | 5 to 20% |
| unlikely / improbable | 20 to 45% |
| roughly even chance / roughly even odds | 45 to 55% |
| likely / probable | 55 to 80% |
| very likely / highly probable | 80 to 95% |
| almost certain / nearly certain | 95 to 99% |

**IPCC likelihood scale** (Guidance Notes for Lead Authors, 2005):

| term | range |
|---|---|
| virtually certain | >99% |
| very likely | >90% |
| likely | >66% |
| about as likely as not | 33 to 66% |
| unlikely | <33% |
| very unlikely | <10% |
| exceptionally unlikely | <1% |

## 2. Descriptive censuses (what readers actually hear)

**Mauboussin and Mauboussin 2018** (HBR "If you say something is 'likely', how likely do people think it is?"; raw data `probability_survey_results.csv` in github.com/amauboussin/probability-survey, 1,976 rows; medians and 10th to 90th percentiles computed from the CSV on 2026-09-12):

| phrase | median | p10 to p90 |
|---|---|---|
| always | 100 | 90 to 100 |
| certainly | 98 | 80 to 100 |
| slam dunk | 95 | 80 to 100 |
| almost certainly | 90 | 80 to 99 |
| almost always | 90 | 80 to 98 |
| with high probability | 80 | 70 to 90 |
| usually | 75 | 60 to 85 |
| probably | 70 | 51 to 80 |
| likely | 70 | 55 to 80 |
| often | 70 | 50 to 80 |
| frequently | 70 | 50 to 80 |
| serious possibility | 66 | 30 to 87 |
| real possibility | 60 | 20 to 80 |
| more often than not | 60 | 51 to 70 |
| with moderate probability | 50 | 30 to 65 |
| maybe | 50 | 25 to 50 |
| possibly | 45 | 15 to 60 |
| might happen | 40 | 10 to 55 |
| unlikely | 20 | 5 to 30 |
| not often | 20 | 10 to 30 |
| with low probability | 15 | 5 to 25 |
| rarely | 10 | 4 to 20 |
| never | 0 | 0 to 5 |

**zonination 2015** (r/samplesize, `probly.csv` in github.com/zonination/perceptions, n=46; medians and interquartile ranges computed from the CSV on 2026-09-12; the joyplot Vincent may be remembering):

| phrase | median | IQR |
|---|---|---|
| almost certainly | 95 | 90 to 98 |
| highly likely | 90 | 83 to 95 |
| very good chance | 80 | 75 to 85 |
| probably | 75 | 64 to 80 |
| we believe | 70 | 60 to 80 |
| probable | 70 | 65 to 80 |
| likely | 70 | 65 to 76 |
| better than even | 60 | 55 to 60 |
| about even | 50 | 50 to 50 |
| probably not | 27 | 20 to 40 |
| we doubt | 25 | 14 to 34 |
| unlikely | 20 | 10 to 30 |
| little chance | 15 | 10 to 20 |
| improbable | 15 | 7 to 29 |
| chances are slight | 10 | 9 to 16 |
| highly unlikely | 5 | 5 to 10 |
| almost no chance | 2 | 1 to 5 |

## 3. What Commit should do with this

1. **Number first, word second, always both.** "74%, likely" on the card; the word is a gloss, never a substitute (scenario F: the word is derived from the same number the engine produced).
2. **One house scale, contiguous, in `src/domain/` beside the confidence presets**, and used by the rules trace and the card alike. Recommended, as a merge of PHIA and ICD 203 with the census medians as the tie-break:

| range | word on the card |
|---|---|
| ≥ 97% | near certain |
| 90 to 97% | very likely |
| 75 to 90% | likely |
| 55 to 75% | probable |
| 45 to 55% | even odds |
| 25 to 45% | unlikely |
| 10 to 25% | very unlikely |
| < 10% | remote |

3. **Map the three presets onto it**: Gamble 60% sits in "probable", Reliable 80% at the "likely" floor, Must happen 95% in "very likely". Show the word beside the preset so the user learns the scale by use.
4. **Avoid the words with the widest census spread** as headline copy: "real possibility", "serious possibility", "possibly", "might", "we believe". They are the ones Kent's analysts disagreed about, and the censuses still do.
5. **Directional words for the delta**, not probability words: "1 CP adds +2%" stays numeric; "SAVE THE CP" is a verdict, not an estimate.
6. Keep this file as the source for the scale's tests: one Vitest case per row asserting the word for the band's endpoints.

## Sources

- Kent, S. (1964). Words of Estimative Probability. CIA Studies in Intelligence. Transcribed at https://en.wikipedia.org/wiki/Words_of_estimative_probability
- PHIA yardstick: https://www.gov.uk/government/publications/explaining-uncertainty-in-uk-intelligence-assessment/explaining-uncertainty-in-uk-intelligence-assessment
- ICD 203: https://www.intel.gov/assets/documents/intelligence-community-directives/ICD_203.pdf (table as summarised at https://github.com/wesinator/ICD203-intel-analysis; unverified against the PDF itself)
- IPCC: as transcribed on the Wikipedia page above (unverified against the 2005 guidance note)
- Mauboussin, A. and Mauboussin, M. (2018). HBR, July 2018. Data: https://github.com/amauboussin/probability-survey
- zonination (2015). Perceptions of Probability and Numbers. https://github.com/zonination/perceptions

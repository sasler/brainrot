---
name: generate-ai-reviews
description: Generate and assemble the mandatory BrainRot cross-model sarcastic game reviews after a batch of implementations is complete. Use when finishing a new game batch, adding competing model versions, or repairing missing aiReviews metadata.
---

# Generate AI Reviews

Run this workflow only after every game implementation in the batch is complete.

## Generate reviews

1. Derive the batch games, target versions, reviewer models, display names, and model IDs from `games-metadata.json`. Do not use a hard-coded model list.
2. Dispatch each reviewer using the exact corresponding AI model. Stop and report an incomplete review cycle if any required model is unavailable; do not substitute another model.
3. Have each model review every other model's implementation in the batch. A model must never review its own implementation.
4. Require exactly 10 distinct, concise one-liners per game and target model. Keep the tone sarcastic and funny without personal or abusive attacks.
5. Save one `reviews-{modelId}.json` file per reviewer using this shape:

   ```json
   {
     "reviewer": "Display Name",
     "gameReviews": {
       "game-id": {
         "target-model-id": ["exactly 10 one-liners"]
       }
     }
   }
   ```

## Validate and assemble

1. Validate reviewer identity, game IDs, target model IDs, counts, non-empty strings, and absence of self-reviews.
2. Do not assemble a partial review set.
3. Run `node scripts/assemble-reviews.js <reviews-dir>`.
4. Inspect the resulting `aiReviews` arrays in `games-metadata.json` and confirm existing unrelated reviews remain intact.
5. Apply the `verify-changes` skill before publication.
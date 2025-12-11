'use strict';

const { supabase } = require('../config/supabase');

const TABLE = 'workout_weights';

async function getSavedWeight(telegramId, groupKey, trainingTypeKey) {
  if (!telegramId || !groupKey || !trainingTypeKey) return null;
  const { data, error } = await supabase
    .from(TABLE)
    .select('weight_kg')
    .eq('telegram_id', telegramId)
    .eq('group_key', groupKey)
    .eq('training_type_key', trainingTypeKey)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

async function saveWeight(telegramId, groupKey, trainingTypeKey, weightKg) {
  const { error } = await supabase.from(TABLE).upsert(
    {
      telegram_id: telegramId,
      group_key: groupKey,
      training_type_key: trainingTypeKey,
      weight_kg: weightKg,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'telegram_id,group_key,training_type_key' }
  );
  if (error) throw error;
  return true;
}

module.exports = {
  getSavedWeight,
  saveWeight,
};

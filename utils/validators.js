// Centralized input validators to keep controller logic lean and reusable across steps.
'use strict';

const MIN_AGE = 10;
const MAX_AGE = 120;
const MIN_WEIGHT = 20; // kg
const MAX_WEIGHT = 400;
const MIN_HEIGHT = 100; // cm
const MAX_HEIGHT = 250;

const sanitizeText = (value = '') => value.trim();

const validateName = (value) => {
  const name = sanitizeText(value);
  if (!name) {
    throw new Error('👤 O campo nome é obrigatório.');
  }
  if (name.length < 3) {
    throw new Error('👤 O nome deve ter pelo menos 3 caracteres.\n_Exemplo: João Silva_');
  }
  return name;
};

const validateAge = (value) => {
  const age = Number(value);
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
    throw new Error(`🎂 Idade inválida.\n\nInforme um número inteiro entre *${MIN_AGE}* e *${MAX_AGE}* anos.\n_Exemplo: 25_`);
  }
  return age;
};

const validateWeight = (value) => {
  const numericValue = Number(value);
  if (Number.isNaN(numericValue)) {
    throw new Error('⚖️ Peso inválido.\n\nInforme apenas números.\n_Exemplo: 70 ou 70.5_');
  }
  const parsed = Number(numericValue.toFixed(1));
  if (parsed < MIN_WEIGHT || parsed > MAX_WEIGHT) {
    throw new Error(`⚖️ Peso fora do intervalo permitido.\n\nInforme um valor entre *${MIN_WEIGHT}kg* e *${MAX_WEIGHT}kg*.\n_Exemplo: 70.5_`);
  }
  return parsed;
};

const validateHeight = (value) => {
  const height = Number(value);
  if (Number.isNaN(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
    throw new Error(`📏 Altura inválida.\n\nInforme um valor entre *${MIN_HEIGHT}cm* e *${MAX_HEIGHT}cm*.\n_Exemplo: 175_`);
  }
  return height;
};

const validateObjective = (value) => {
  const objective = sanitizeText(value);
  if (!objective) {
    throw new Error('🎯 O campo objetivo é obrigatório.\n\n_Exemplo: Emagrecer, ganhar massa muscular, melhorar saúde..._');
  }
  return objective;
};

const validateRestrictions = (value) => sanitizeText(value) || 'Sem restrições';

module.exports = {
  validateName,
  validateAge,
  validateWeight,
  validateHeight,
  validateObjective,
  validateRestrictions,
};

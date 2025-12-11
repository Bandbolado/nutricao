// Cálculos nutricionais baseados em dados científicos para análise corporal.
'use strict';

// Calcula o IMC (Índice de Massa Corporal).
const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  return parseFloat(bmi.toFixed(1));
};

// Classifica o IMC de acordo com a OMS.
const classifyBMI = (bmi) => {
  if (bmi < 18.5) return { classification: 'Abaixo do peso', emoji: '⚠️' };
  if (bmi < 25) return { classification: 'Peso normal', emoji: '✅' };
  if (bmi < 30) return { classification: 'Sobrepeso', emoji: '⚠️' };
  if (bmi < 35) return { classification: 'Obesidade Grau I', emoji: '🔴' };
  if (bmi < 40) return { classification: 'Obesidade Grau II', emoji: '🔴' };
  return { classification: 'Obesidade Grau III', emoji: '🔴' };
};

// Calcula a Taxa Metabólica Basal (TMB) usando fórmula de Mifflin-St Jeor.
// Retorna calorias/dia necessárias em repouso.
const calculateTMB = (weight, height, age, gender = 'male') => {
  let tmb;
  if (gender === 'male') {
    tmb = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    tmb = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  return Math.round(tmb);
};

// Calcula necessidade calórica diária baseada no nível de atividade.
const calculateDailyCalories = (tmb, activityLevel = 'sedentary') => {
  const multipliers = {
    sedentary: 1.2,        // Pouco ou nenhum exercício
    light: 1.375,          // Exercício leve 1-3 dias/semana
    moderate: 1.55,        // Exercício moderado 3-5 dias/semana
    active: 1.725,         // Exercício intenso 6-7 dias/semana
    veryActive: 1.9,       // Exercício muito intenso, físico ou treino 2x/dia
  };

  return Math.round(tmb * (multipliers[activityLevel] || multipliers.sedentary));
};

// Calcula distribuição de macronutrientes (proteína, carboidrato, gordura).
const calculateMacros = (dailyCalories, objective = 'maintain') => {
  let proteinPercent, carbPercent, fatPercent;

  switch (objective.toLowerCase()) {
    case 'perder peso':
    case 'emagrecer':
    case 'definir':
      proteinPercent = 0.35;
      carbPercent = 0.30;
      fatPercent = 0.35;
      break;
    case 'ganhar massa':
    case 'hipertrofia':
    case 'bulking':
      proteinPercent = 0.30;
      carbPercent = 0.45;
      fatPercent = 0.25;
      break;
    default: // Manter peso / saúde geral
      proteinPercent = 0.30;
      carbPercent = 0.40;
      fatPercent = 0.30;
  }

  return {
    protein: Math.round((dailyCalories * proteinPercent) / 4), // 4 cal/g
    carbs: Math.round((dailyCalories * carbPercent) / 4),      // 4 cal/g
    fats: Math.round((dailyCalories * fatPercent) / 9),        // 9 cal/g
  };
};

// Gera análise nutricional completa formatada para Telegram.
const generateNutritionalAnalysis = (patient, activityLevel = 'sedentary', gender = 'male') => {
  const bmi = calculateBMI(patient.weight, patient.height);
  const bmiClass = classifyBMI(bmi);
  const tmb = calculateTMB(patient.weight, patient.height, patient.age, gender);
  const dailyCalories = calculateDailyCalories(tmb, activityLevel);
  const macros = calculateMacros(dailyCalories, patient.objective);

  return {
    bmi,
    bmiClass,
    tmb,
    dailyCalories,
    macros,
    formatted: (
      `🧮 *Análise Nutricional Completa*\n\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `📊 *IMC (Índice de Massa Corporal)*\n` +
      `   ${bmiClass.emoji} *${bmi}* - ${bmiClass.classification}\n\n` +
      `🔥 *TMB (Taxa Metabólica Basal)*\n` +
      `   ${tmb} kcal/dia em repouso\n\n` +
      `🍽️ *Necessidade Calórica Diária*\n` +
      `   ${dailyCalories} kcal/dia\n` +
      `   _(Nível de atividade: ${activityLevel})_\n\n` +
      `⚖️ *Distribuição de Macronutrientes*\n` +
      `   🥩 Proteína: *${macros.protein}g/dia*\n` +
      `   🍚 Carboidrato: *${macros.carbs}g/dia*\n` +
      `   🥑 Gordura: *${macros.fats}g/dia*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `💡 _Valores calculados com base no seu perfil e objetivo: ${patient.objective}_`
    ),
  };
};

module.exports = {
  calculateBMI,
  classifyBMI,
  calculateTMB,
  calculateDailyCalories,
  calculateMacros,
  generateNutritionalAnalysis,
};

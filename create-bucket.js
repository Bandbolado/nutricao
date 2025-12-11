const { supabase } = require('./config/supabase');

async function createBucket() {
  console.log('Criando bucket patient-files...\n');
  
  // Tentar criar o bucket
  const { data, error } = await supabase.storage.createBucket('patient-files', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  });
  
  if (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Bucket já existe!');
    } else {
      console.error('❌ Erro ao criar bucket:', error);
      console.log('\n📝 Instruções manuais:');
      console.log('1. Acesse: https://supabase.com/dashboard');
      console.log('2. Vá em Storage → New Bucket');
      console.log('3. Nome: patient-files');
      console.log('4. Marque "Public bucket"');
      console.log('5. Clique em "Create bucket"');
    }
  } else {
    console.log('✅ Bucket criado com sucesso!');
    console.log('Dados:', data);
  }
  
  // Verificar se o bucket existe
  const { data: buckets } = await supabase.storage.listBuckets();
  console.log('\n📦 Buckets disponíveis:');
  buckets?.forEach(b => console.log(`  - ${b.name} (${b.public ? 'público' : 'privado'})`));
  
  const bucketExists = buckets?.some(b => b.name === 'patient-files');
  if (bucketExists) {
    console.log('\n✅ Bucket patient-files está configurado!');
  } else {
    console.log('\n⚠️ Bucket patient-files NÃO encontrado. Configure manualmente.');
  }
}

createBucket()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Erro fatal:', e);
    process.exit(1);
  });

<?php
// 1. O Host deve ser o do "Pooler" (geralmente termina em .pooler.supabase.com)
// 2. A Porta para o Pooler é a 6543
$host = "aws-0-sa-east-1.pooler.supabase.com"; // <-- Verifique o host exato no seu painel
$port = "6543"; 
$dbname = "postgres"; // O nome padrão no Supabase costuma ser 'postgres'
$user = "postgres";   // O usuário padrão é 'postgres', não 'root'
$pass = "Gsdafesi#123";

try {
    // MUDANÇA CRUCIAL: Usar 'pgsql' em vez de 'mysql'
    $dsn = "pgsql:host=$host;port=$port;dbname=$dbname";
    
    $pdo = new PDO($dsn, $user, $pass);
    
    // Configurações recomendadas
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

    echo "Conectado com sucesso ao Supabase!";
} catch (PDOException $e) {
    die("Erro na conexão: " . $e->getMessage());
}
?>

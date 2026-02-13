<?php
header("Content-Type: application/json");
require_once "conexao.php"; // Certifique-se que o caminho está correto

// Recebe os dados do globalscript.js
$dados = json_decode(file_get_contents("php://input"), true);

if (!$dados) {
    echo json_encode(["status" => "error", "message" => "Dados não recebidos."]);
    exit;
}

try {
    // 1. TRATAMENTO DO NOME (Remove acentos e caracteres especiais)
    // Substitui espaços por underline e limpa o nome do militar
    $nomeMilitar = preg_replace('/[^A-Za-z0-9]/', '', str_replace(' ', '_', $dados['nome']));
    
    // 2. DATA DE PUBLICAÇÃO (Formato para o nome do arquivo: Dia-Mes-Ano_Hora-Minuto)
    $dataPublicacao = date('d-m-Y_H-i'); 
    
    $base64Data = $dados['pdfBase64'];
    
    // Identifica a extensão (PDF ou JPG) e força .pdf se for o caso
    $extensao = (strpos($base64Data, 'application/pdf') !== false) ? 'pdf' : 'jpg';
    
    // NOME FINAL: DISPENSA_NOME_DATA.pdf
    $nomeArquivoFisico = "DISPENSA_" . $nomeMilitar . "_" . $dataPublicacao . "." . $extensao;
    $caminhoPasta = "../uploads/";

    // 3. GESTÃO DA PASTA FÍSICA
    if (!is_dir($caminhoPasta)) {
        mkdir($caminhoPasta, 0777, true);
    }

    // Decodifica o Base64 e salva o arquivo fisicamente
    $partes = explode(',', $base64Data);
    if (isset($partes[1])) {
        $conteudoArquivo = base64_decode($partes[1]);
        file_put_contents($caminhoPasta . $nomeArquivoFisico, $conteudoArquivo);
    }

    // 4. GRAVAÇÃO NO BANCO DE DADOS
    // Usamos 'data_inicio' para evitar o erro de 01/01/1970
    $sql = "INSERT INTO dispensas (nome, saram, turma, situacao, data_inicio, dias, tipo, motivo, pdf_base64) 
            VALUES (:nome, :saram, :turma, :situacao, :data, :dias, :tipo, :motivo, :pdf)";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':nome'     => $dados['nome'],
        ':saram'    => $dados['saram'],
        ':turma'    => $dados['turma'],
        ':situacao' => $dados['situacao'],
        ':data'     => $dados['data'],
        ':dias'     => $dados['dias'],
        ':tipo'     => $dados['tipo'],
        ':motivo'   => $dados['motivo'],
        ':pdf'      => $base64Data 
    ]);

    // Retorno em JSON para evitar erros de "Unexpected token <" no JavaScript
    echo json_encode([
        "status" => "success",
        "message" => "Sucesso! Arquivo salvo como $nomeArquivoFisico"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "status" => "error", 
        "message" => "Erro ao processar: " . $e->getMessage()
    ]);
}
?>
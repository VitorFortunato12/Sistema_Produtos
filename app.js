const express = require('express');//improta modulo express
const fileUpload = require('express-fileupload');//importa modulo express-fileupload
const mysql = require('mysql2');//importa modulo mysql
const fs = require('fs');//importa modulo file systems
const { engine } = require('express-handlebars');//importa modulo express-handlebars

const app = express();//cria uma instancia do express
app.use(fileUpload());//habilitando upload de arquivos

//adicionar bootstrap
app.use('/bootstrap', express.static('./node_modules/bootstrap/dist'));

//Refereciar a pasta imagens
app.use('/imagens', express.static('./imagens'));

//configuração handlebars
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

//configuração da conexão bd
const conexao = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Vt050205!',
    database: 'produtos'
});

//manipulaçao de daddos via rotas
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

conexao.connect(function (erro) {
    if (erro) {
        console.log(erro.code + 'Erro ao conectar com o banco de dados');
    } else {
        console.log('Conectado com sucesso ao banco de dados');
    }
});

//rota home
app.get('/cadastrarProduto', function (req, res) {
    res.render('cadastroProdutos');
});

//rota cadastro Produtos
app.post('/cadastrarProduto', function (req, res) {
    try {
        let { nome, descricao, categoria, preco, quantidade } = req.body;

        // Validação dos campos obrigatórios
        if (!nome || !descricao || !categoria || !preco || !quantidade) {
            return res.send(`
                <script>
                    alert("Todos os campos são obrigatórios. Por favor, preencha todos os dados.");
                    window.location.href = '/cadastrarProduto';
                </script>
            `);
        }

        // Validação do envio da imagem
        if (!req.files || !req.files.imagem) {
            return res.send(`
                <script>
                    alert("É necessário enviar uma imagem do produto.");
                    window.location.href = '/cadastrarProduto';
                </script>
            `);
        }

        let imagem = req.files.imagem.name;

        // SQL para inserção
        let sql = `
            INSERT INTO produto (nome, descricao, categoria, preco, quantidade, imagem) 
            VALUES ('${nome}', '${descricao}', '${categoria}', '${preco}', '${quantidade}', '${imagem}')
        `;

        conexao.query(sql, function (erro, retorno) {
            // Tratamento de erros do banco de dados
            if (erro) {
                console.error(erro);
                let mensagem = "Erro ao salvar no banco de dados. ";
                if (erro.code === 'ER_DUP_ENTRY') {
                    mensagem += "Produto com os mesmos dados já existe.";
                } else if (erro.code === 'ER_BAD_NULL_ERROR') {
                    mensagem += "Algum campo obrigatório está faltando.";
                } else {
                    mensagem += "Por favor, tente novamente.";
                }

                return res.send(`
                    <script>
                        alert("${mensagem}");
                        window.location.href = '/cadastrarProduto';
                    </script>
                `);
            }

            // Salvando a imagem no servidor
            req.files.imagem.mv(__dirname + '/imagens/' + imagem, function (uploadErro) {
                if (uploadErro) {
                    console.error(uploadErro);
                    return res.send(`
                        <script>
                            alert("Erro ao salvar a imagem. Tente novamente.");
                            window.location.href = '/cadastrarProduto';
                        </script>
                    `);
                }

                // Redirecionamento caso tudo ocorra bem
                res.redirect('/listaProdutos');
            });
        });

    } catch (ex) {
        console.error(ex);
        res.send(`
            <script>
                alert("Ocorreu um erro inesperado. Tente novamente.");
                window.location.href = '/cadastrarProduto';
            </script>
        `);
    }
});

app.get('/listaProdutos', function (req, res) {
    const { nomePesquisa, categoria } = req.query;

    // Construir a query com os filtros
    let sql = 'SELECT * FROM produto WHERE 1=1'; // "1=1" permite adicionar condições dinamicamente

    if (nomePesquisa && nomePesquisa.trim() !== '') {
        sql += ` AND nome LIKE '%${nomePesquisa}%'`; // Filtrar por nome
    }

    if (categoria && categoria.trim() !== '') {
        sql += ` AND categoria = '${categoria}'`; // Filtrar por categoria
    }

    conexao.query(sql, function (erro, produtos) {
        if (erro) {
            console.error('Erro ao buscar produtos:', erro);
            return res.status(500).send('Erro ao buscar produtos.');
        }

        // Renderizar a página com os produtos filtrados e parâmetros de pesquisa
        res.render('listaProdutos', {
            produtos,
            nomePesquisa, // Para preencher o campo de pesquisa no formulário
            categoria,    // Para selecionar a categoria no filtro
        });
    });
});

const Handlebars = require('handlebars');

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==': return (v1 == v2) ? options.fn(this) : options.inverse(this);
        default: return options.inverse(this);
    }
});

/*app.get('/listaProdutos', function (req, res) {
    let sql = 'SELECT * FROM produto';
    conexao.query(sql, function (erro, retorno) {
        res.render('listaProdutos', { produtos: retorno, situacao: req.params.situacao });
    });
});*/

//rota para decrementar (comprar)
app.get('/comprar/:id_produto', (req, res) => {
    const id = req.params.id_produto;

    // Buscar detalhes do produto
    conexao.query('SELECT preco, quantidade FROM produto WHERE id_produto = ?', [id], (erro, resultados) => {
        if (erro || resultados.length === 0) {
            console.error('Erro ao buscar produto:', erro);
            return res.status(500).send('Erro ao processar a compra.');
        }

        const produto = resultados[0];

        if (produto.quantidade <= 0) {
            return res.status(400).send('Estoque insuficiente.');
        }

        const valorTotal = produto.preco; // Considera uma unidade para o exemplo

        // Atualizar estoque e registrar venda
        conexao.query(
            'UPDATE produto SET quantidade = quantidade - 1 WHERE id_produto = ? AND quantidade > 0',
            [id],
            (erroAtualizar) => {
                if (erroAtualizar) {
                    console.error('Erro ao atualizar estoque:', erroAtualizar);
                    return res.status(500).send('Erro ao atualizar estoque.');
                }

                // Inserir venda no banco
                conexao.query(
                    'INSERT INTO venda (id_produto, quantidade, valor_total) VALUES (?, ?, ?)',
                    [id, 1, valorTotal],
                    (erroVenda) => {
                        if (erroVenda) {
                            console.error('Erro ao registrar venda:', erroVenda);
                            return res.status(500).send('Erro ao registrar venda.');
                        }

                        // Redirecionar de volta para a lista de produtos
                        res.redirect('/listaProdutos');
                    }
                );
            }
        );
    });
});

//rota remoçao produto
app.get('/remover/:id_produto/:imagem', function (req, res) {
    const { id_produto, imagem } = req.params;

    // Atualizar vendas para desvincular o produto
    const atualizarVendas = 'UPDATE venda SET id_produto = NULL WHERE id_produto = ?';
    conexao.query(atualizarVendas, [id_produto], (erroAtualizar) => {
        if (erroAtualizar) {
            console.error('Erro ao atualizar vendas associadas:', erroAtualizar);
            return res.send(`
                <script>
                    alert("Erro ao atualizar vendas associadas.");
                    window.location.href = '/listaProdutos';
                </script>
            `);
        }

        // Excluir o produto
        const deleteProduto = 'DELETE FROM produto WHERE id_produto = ?';
        conexao.query(deleteProduto, [id_produto], (erroProduto) => {
            if (erroProduto) {
                console.error('Erro ao remover produto:', erroProduto);
                return res.send(`
                    <script>
                        alert("Erro ao remover produto.");
                        window.location.href = '/listaProdutos';
                    </script>
                `);
            }

            // Remover a imagem do servidor
            const caminhoImagem = __dirname + '/imagens/' + imagem;
            fs.unlink(caminhoImagem, (erroImagem) => {
                if (erroImagem) {
                    console.error('Erro ao remover imagem:', erroImagem);
                }

                // Redirecionar após a operação
                res.redirect('/listaProdutos');
            });
        });
    });
});



//rota para rediricionar para editar produto
app.get('/formularioEditar/:id_produto', function (req, res) {
    let sql = `SELECT * FROM produto WHERE id_produto = ${req.params.id_produto}`;
    conexao.query(sql, function (erro, retorno) {
        if (erro) throw erro;
        res.render('formularioEditar', { produto: retorno[0] });
    });;
});

//rota para editar produto
app.post('/editar', function (req, res) {
    let { id_produto, nome, descricao, categoria, preco, quantidade, nomeImagem } = req.body;

    //Validação dos campos obrigatorios
    if (!id_produto || !nome || !descricao || !categoria || !preco || !quantidade) {
        return res.send(`
            <script>
                alert("Todos os campos são obrigatórios. Por favor, preencha todos os dados.");
                window.location.href = '/formularioEditar/${id_produto}';
            </script>
        `);
    }

    //Definir o tipo de ediçao
    try {
        let imagem = req.files.imagem;
        let sql = `UPDATE produto SET nome = '${nome}', descricao = '${descricao}', categoria = '${categoria}', preco = '${preco}', quantidade = '${quantidade}', imagem = '${imagem.name}' WHERE id_produto = ${id_produto}`;

        conexao.query(sql, function (erro, retorno) {
            if (erro) throw erro;

            //remover imagem antiga
            fs.unlink(__dirname + '/imagens/' + nomeImagem, (erro_imagem) => {
                console.log('Falha ao remvore');
            });

            //salvar nova imagem
            imagem.mv(__dirname + '/imagens/' + imagem.name);
        });
    } catch (erro) {
        let sql = `UPDATE produto SET nome = '${nome}', descricao = '${descricao}', categoria = '${categoria}', preco = '${preco}', quantidade = '${quantidade}' WHERE id_produto = ${id_produto}`;

        conexao.query(sql, function (erro, retorno) {
            if (erro) throw erro;
        });
    }
    res.redirect('/listaProdutos');
});

//relatorio de vendas
app.get('/relatorioVendas', function (req, res) {
    let sql = `
        SELECT v.id_venda, p.nome AS produto, v.quantidade, v.valor_total, v.data_venda
        FROM venda v
        JOIN produto p ON v.id_produto = p.id_produto
    `;
    conexao.query(sql, function (erro, retorno) {
        if (erro) {
            console.error('Erro ao buscar vendas:', erro);
            return res.status(500).send('Erro ao buscar vendas.');
        }
        res.render('relatorioVendas', { vendas: retorno });
    });
});


//servidor
app.listen(3000);
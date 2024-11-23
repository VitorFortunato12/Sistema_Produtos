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
    let { nome, descricao, categoria, preco, quantidade } = req.body;
    let imagem = req.files?.imagem?.name;
    let sql = `INSERT INTO produto (nome, descricao, categoria, preco, quantidade, imagem) VALUES ('${nome}', '${descricao}', '${categoria}', '${preco}', '${quantidade}', '${imagem}')`;

    conexao.query(sql, function (erro, retorno) {
        //caso ocorra algum erro
        if (erro) throw erro;

        //caso contrario
        req.files.imagem.mv(__dirname + '/imagens/' + req.files.imagem.name);
        console.log(retorno)
    });
    res.end();
    //res.redirect('/listaProdutos');
});

app.get('/listaProdutos', function (req, res) {
    let sql = 'SELECT * FROM produto';
    conexao.query(sql, function (erro, retorno) {
        res.render('listaProdutos', { produtos: retorno });
    });
});

//rota remoçao produto
app.get('/remover/:id_produto&:imagem', function (req, res) {
    let sql = `DELETE FROM produto WHERE id_produto = ${req.params.id_produto}`;

    conexao.query(sql, function (erro, retorno) {
        if (erro) throw erro;
        fs.unlink(__dirname + '/imagens/' + req.params.imagem,(erro_imagem)=> {
            console.log(erro_imagem);
        });
    });
    res.redirect('/listaProdutos');
});
//rota para rediricionar para editar produto
app.get('/formularioEditar/:id_produto', function (req, res) {
    let sql = `SELECT * FROM produto WHERE id_produto = ${req.params.id_produto}`;
    conexao.query(sql, function(erro,retorno){
        if(erro) throw erro;
        res.render('formularioEditar', {produto:retorno[0]});
    });;
});
//servidor
app.listen(3000);
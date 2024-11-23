const express = require('express');//improta modulo express
const fileUpload = require('express-fileupload');//importa modulo express-fileupload
const mysql = require('mysql2');//importa modulo mysql
const {engine} = require('express-handlebars');//importa modulo express-handlebars

const app = express();//cria uma instancia do express
app.use(fileUpload());//habilitando upload de arquivos

//adicionar bootstrap
app.use('/bootstrap', express.static('./node_modules/bootstrap/dist'));

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
app.use(express.urlencoded({extended: false}));

conexao.connect(function(erro){
    if(erro){
        console.log( erro.code + 'Erro ao conectar com o banco de dados');
    }else{
        console.log('Conectado com sucesso ao banco de dados');
    }
});

//rota home
app.get('/cadastrarProduto', function(req, res){
    res.render('cadastroProdutos');
});

//rota cadastro Produtos
app.post('/cadastrarProduto', function(req, res){
    console.log(req.body);
    console.log(req.files.imagem.name);

    //envia a imagem para o diretorio imagens
    req.files.imagem.mv(__dirname + '/imagens/' + req.files.imagem.name);
    res.end();
});

//servidor
app.listen(3000);
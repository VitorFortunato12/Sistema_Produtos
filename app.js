const express = require('express');//improta modulo express
const mysql = require('mysql2');//importa modulo mysql
const {engine} = require('express-handlebars');//importa modulo express-handlebars

const app = express();//cria uma instancia do express

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

conexao.connect(function(erro){
    if(erro){
        console.log( erro.code + 'Erro ao conectar com o banco de dados');
    }else{
        console.log('Conectado com sucesso ao banco de dados');
    }
});

//rota 
app.get('/', function (req, res){
    res.render('cadastroProdutos');
});

//servidor
app.listen(3000);
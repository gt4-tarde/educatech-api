process.env.NODE_ENV = 'test';

const request = require('supertest');
const db = require('../src/models');
const app = require('../src/server');

beforeAll(async () => {
  await db.sequelize.sync({ force: true });
});

afterEach(async () => {
  await db.sequelize.sync({ force: true });
});

describe('configuração do banco', () => {
  it('deve expor a configuração de teste do sqlite em memória', () => {
    const config = require('../config/config');

    expect(config.test.dialect).toBe('sqlite');
    expect(config.test.storage).toBe(':memory:');
  });

  it('deve usar o ambiente padrão quando NODE_ENV não é informado', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    delete process.env.NODE_ENV;
    process.env.DB_DIALECT = 'sqlite';

    let database;
    jest.isolateModules(() => {
      database = require('../src/models');
    });

    expect(database.sequelize.options.dialect).toBe('sqlite');
    expect(database.sequelize.config.database).toBeDefined();

    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
    jest.dontMock('dotenv');
  });

  it('deve cobrir os valores padrão de database, host e port do config', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    delete process.env.DB_NAME;
    delete process.env.DB_HOST;
    delete process.env.DB_PORT;
    delete process.env.DB_DIALECT;
    delete process.env.DB_SSL;

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.database).toBe('educatech_manha');
    expect(config.development.host).toBe('127.0.0.1');
    expect(config.development.port).toBe(3306);
    expect(config.development.dialect).toBe('sqlite');
    expect(config.production.dialect).toBe('mysql');

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });

  it('deve cobrir os valores customizados de database, host e port do config', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env.DB_NAME = 'educatech_custom';
    process.env.DB_HOST = 'db.local';
    process.env.DB_PORT = '3307';
    process.env.DB_DIALECT = 'mysql';
    process.env.DB_SSL = 'false';

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.database).toBe('educatech_custom');
    expect(config.development.host).toBe('db.local');
    expect(config.development.port).toBe(3307);
    expect(config.development.dialect).toBe('mysql');
    expect(config.production.database).toBe('educatech_custom');

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });

  it('deve cobrir o branch de DB_SSL=true para sqlite local', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env.DB_SSL = 'true';
    process.env.DB_HOST = 'localhost';
    process.env.DB_DIALECT = 'sqlite';

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.dialect).toBe('sqlite');
    expect(config.development.dialectOptions).toBeUndefined();
    expect(config.production.dialectOptions).toBeUndefined();

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });

  it('deve cobrir o branch de DB_SSL=1 para sqlite local', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env.DB_SSL = '1';
    process.env.DB_HOST = 'localhost';
    process.env.DB_DIALECT = 'sqlite';

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.dialect).toBe('sqlite');
    expect(config.development.dialectOptions).toBeUndefined();
    expect(config.production.dialectOptions).toBeUndefined();

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });

  it('deve cobrir o branch de host do TiDB Cloud', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env.DB_SSL = 'false';
    process.env.DB_HOST = 'db-prod.tidbcloud.com';
    process.env.DB_DIALECT = 'sqlite';

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.dialectOptions).toBeDefined();
    expect(config.production.dialectOptions).toBeDefined();
    expect(config.development.dialectOptions.ssl.require).toBe(true);

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });

  it('deve cobrir o branch de dialeto mysql', () => {
    const previousEnv = { ...process.env };
    jest.resetModules();
    jest.doMock('dotenv', () => ({ config: jest.fn() }));
    process.env.DB_SSL = 'false';
    process.env.DB_HOST = 'localhost';
    process.env.DB_DIALECT = 'mysql';

    let config;
    jest.isolateModules(() => {
      config = require('../config/config');
    });

    expect(config.development.dialect).toBe('mysql');
    expect(config.production.dialect).toBe('mysql');
    expect(config.development.dialectOptions).toEqual({});
    expect(config.production.dialectOptions).toEqual({});

    process.env = { ...previousEnv };
    jest.dontMock('dotenv');
  });
});

describe('modelos', () => {
  it('deve definir os modelos e os campos esperados', () => {
    expect(db.Aluno.tableName).toBe('alunos');
    expect(db.Professor.tableName).toBe('professores');
    expect(db.Curso.tableName).toBe('cursos');
    expect(db.Matricula.tableName).toBe('matriculas');

    expect(db.Aluno.getAttributes().nome.allowNull).toBe(false);
    expect(db.Aluno.getAttributes().email.unique).toBe(true);
    expect(db.Curso.getAttributes().cargaHoraria.field).toBe('carga_horaria');
    expect(db.Matricula.getAttributes().situacao.type.values).toEqual([
      'EM_ANDAMENTO',
      'CONCLUIDA',
      'CANCELADA'
    ]);
  });

  it('deve configurar as associações entre modelos', () => {
    expect(db.Professor.associations.cursos).toBeTruthy();
    expect(db.Curso.associations.professor).toBeTruthy();
    expect(db.Aluno.associations.matriculas).toBeTruthy();
    expect(db.Curso.associations.matriculas).toBeTruthy();
    expect(db.Matricula.associations.aluno).toBeTruthy();
    expect(db.Matricula.associations.curso).toBeTruthy();
  });
});

describe('API', () => {
  it('deve responder ao health check', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, service: 'educatech-api' });
  });

  it('deve listar alunos com ordenação e filtro por busca', async () => {
    await db.Aluno.create({ nome: 'Ana', email: 'ana@email.com' });
    await db.Aluno.create({ nome: 'Bruno', email: 'bruno@email.com' });

    const allResponse = await request(app).get('/api/alunos');
    const filteredResponse = await request(app).get('/api/alunos?search=An');

    expect(allResponse.status).toBe(200);
    expect(allResponse.body).toHaveLength(2);
    expect(filteredResponse.status).toBe(200);
    expect(filteredResponse.body).toHaveLength(1);
    expect(filteredResponse.body[0].nome).toBe('Ana');
  });

  it('deve criar, atualizar e excluir professor', async () => {
    const createResponse = await request(app)
      .post('/api/professores')
      .send({ nome: 'Prof. Silva', email: 'silva@email.com', telefone: '11999999999', especialidade: 'Node.js' });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.nome).toBe('Prof. Silva');

    const updateResponse = await request(app)
      .put(`/api/professores/${createResponse.body.id}`)
      .send({ nome: 'Prof. Silva Jr.' });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.nome).toBe('Prof. Silva Jr.');

    const deleteResponse = await request(app).delete(`/api/professores/${createResponse.body.id}`);
    expect(deleteResponse.status).toBe(204);
  });

  it('deve criar matrícula com relações e listar cursos com professor', async () => {
    const professor = await db.Professor.create({
      nome: 'Professor Teste',
      email: 'professor@email.com',
      telefone: '11988888888',
      especialidade: 'Backend'
    });

    const curso = await db.Curso.create({
      nome: 'Curso de Node',
      descricao: 'Aprendendo Node.js',
      cargaHoraria: 40,
      valor: '1500.00',
      professorId: professor.id
    });

    const aluno = await db.Aluno.create({
      nome: 'Maria',
      email: 'maria@email.com'
    });

    const response = await request(app)
      .post('/api/matriculas')
      .send({ alunoId: aluno.id, cursoId: curso.id, situacao: 'EM_ANDAMENTO' });

    expect(response.status).toBe(201);
    expect(response.body.alunoId).toBe(aluno.id);
    expect(response.body.cursoId).toBe(curso.id);

    const cursosResponse = await request(app).get('/api/cursos');
    expect(cursosResponse.status).toBe(200);
    expect(cursosResponse.body[0].professor.nome).toBe('Professor Teste');
  });

  it('deve retornar 404 para recurso inexistente e registros não encontrados', async () => {
    const invalidResource = await request(app).get('/api/recursos-inexistentes');
    expect(invalidResource.status).toBe(404);
    expect(invalidResource.body.error).toBe('Recurso não encontrado');

    const missingUpdate = await request(app).put('/api/alunos/999').send({ nome: 'X' });
    expect(missingUpdate.status).toBe(404);
    expect(missingUpdate.body.error).toBe('Registro não encontrado');

    const missingDelete = await request(app).delete('/api/alunos/999');
    expect(missingDelete.status).toBe(404);
    expect(missingDelete.body.error).toBe('Registro não encontrado');
  });

  it('deve validar erros de dados e conflitos de unicidade', async () => {
    const invalid = await request(app)
      .post('/api/alunos')
      .send({ nome: '', email: 'email-invalido' });

    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toContain('nome');

    await db.Aluno.create({ nome: 'João', email: 'joao@email.com' });

    const duplicated = await request(app)
      .post('/api/alunos')
      .send({ nome: 'José', email: 'joao@email.com' });

    expect(duplicated.status).toBe(400);
    expect(duplicated.body.error).toContain('email');
  });

  it('deve tratar erro interno do servidor', async () => {
    const originalFindAll = db.Professor.findAll;
    db.Professor.findAll = jest.fn(() => {
      throw new Error('Falha inesperada');
    });

    const response = await request(app).get('/api/professores');

    expect(response.status).toBe(500);
    expect(response.body.error).toBe('Erro interno do servidor');

    db.Professor.findAll = originalFindAll;
  });
});

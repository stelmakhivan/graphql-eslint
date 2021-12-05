import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createServer, Server, IncomingMessage, ServerResponse } from 'http';
import { buildSchema, introspectionFromSchema } from 'graphql';

const sdlSchema = readFileSync(resolve(__dirname, 'user-schema.graphql'), 'utf8');
const graphqlSchemaObj = buildSchema(sdlSchema);
const introspectionQueryResult = introspectionFromSchema(graphqlSchemaObj);

class TestGraphQLServer {
  private server: Server;
  private base: string;

  constructor(private port = 1337) {
    this.server = createServer(this.router.bind(this));
    this.base = `http://localhost:${this.port}`;
  }

  start(): Promise<{ url: string }> {
    return new Promise(resolve => {
      this.server.listen(this.port, () => {
        resolve({ url: this.base });
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server.close(err => {
        err ? reject(err) : resolve();
      });
    });
  }

  private async router(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const { pathname } = new URL(req.url, this.base);

    if (pathname === '/') {
      const { query } = await this.parseData(req);
      if (query.includes('query IntrospectionQuery')) {
        res.end(JSON.stringify({
          data: introspectionQueryResult
        }));
      }
    } else if (pathname === '/my-headers') {
      res.end(JSON.stringify(req.headers));
    }
  }

  private parseData(req: IncomingMessage): Promise<any | string> {
    return new Promise(resolve => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => {
        if (req.headers['content-type'] === 'application/json') {
          resolve(JSON.parse(data));
        } else {
          resolve(data);
        }
      });
    });
  }
}

const graphqlServer = new TestGraphQLServer();

graphqlServer.start().then(({ url }) => {
  // eslint-disable-next-line no-console
  console.log(url);
});

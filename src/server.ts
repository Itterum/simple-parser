import Fastify from 'fastify';
import { extractors } from './extractors/extractors';
import logger from './utils/logger';

const fastify = Fastify({
  logger: false, // We use our own pino logger
});

interface ExtractRequest {
  url: string;
  extractor: string;
  headless?: boolean;
  proxy?: string;
  retries?: number;
}

fastify.post('/api/v1/extract', async (request, reply) => {
  const { url, extractor: extractorName, headless, proxy, retries } = request.body as ExtractRequest;

  if (!url || !extractorName) {
    return reply.status(400).send({ error: 'url and extractor are required' });
  }

  const extractor = extractors[extractorName];
  if (!extractor) {
    return reply.status(404).send({ 
      error: `Extractor "${extractorName}" not found`,
      available: Object.keys(extractors)
    });
  }

  logger.info({ url, extractorName }, 'Received extraction task');

  try {
    const data = await extractor.parsePage(url, { 
      headless: headless !== false, // default to headless: true
      proxy, 
      retries: retries ?? 3 
    });
    
    return { success: true, url, data };
  } catch (err) {
    logger.error({ err, url }, 'Extraction task failed');
    return reply.status(500).send({ 
      success: false, 
      url, 
      error: (err as Error).message 
    });
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000');
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Worker server listening on port ${port}`);
  } catch (err) {
    logger.error(err);
    process.exit(1);
  }
};

start();

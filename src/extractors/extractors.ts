import GithubExtractor from './github';
import { BaseExtractor } from './base';

export const extractors: Record<string, BaseExtractor<unknown>> = {
  'github-extractor': new GithubExtractor(),
};

import GithubExtractor from './github';
import { DynamicExtractor } from './dynamic';
import { BaseExtractor } from './base';

export const extractors: Record<string, BaseExtractor<any>> = {
  'github-extractor': new GithubExtractor(),
  'dynamic-extractor': new DynamicExtractor(),
};

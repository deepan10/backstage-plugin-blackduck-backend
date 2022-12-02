/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { BlackDuckRestApi } from '../api/BlackDuckRestApi';

export interface RouterOptions {
  logger: Logger;
  config: Config;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;

  const config = options.config.getConfig('blackduck');
  const host = config.getString('host');
  const token = config.getString('token');

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get(
    '/vulns/:projectName/:projectVersion',
    async (_request, response) => {
      logger.verbose('getting vulnarabilities..');
      const { projectName, projectVersion } = _request.params;
      const blackDuck = new BlackDuckRestApi(logger, host, token);
      await blackDuck.auth();
      const vulns = await blackDuck.getVulnerabilities(projectName, projectVersion);      
      response.json(vulns);
    },
  );

  router.use(errorHandler());
  return router;
}

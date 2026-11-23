import { ApolloDriverConfig } from '@nestjs/apollo';
import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GqlOptionsFactory } from '@nestjs/graphql';
import { STATUS_CODES } from 'node:http';
import { join } from 'node:path';
import { GraphQLError } from 'graphql';
import { BaseError } from './common/errors';

/**
 * The server package root (`apps/server`), from both `src/` (ts-node, Jest) and the flat `dist/`
 * build. The schema path is resolved from here rather than from the working directory, so starting
 * the server from the repo root doesn't write a stray `src/schema.graphql` there.
 */
const SERVER_ROOT = join(__dirname, '..');

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  private readonly logger = new Logger(GqlConfigService.name);
  constructor(private configService: ConfigService) {}
  createGqlOptions(): ApolloDriverConfig {
    const graphqlConfig = this.configService.get('graphql');
    return {
      // schema options
      autoSchemaFile: join(SERVER_ROOT, graphqlConfig.schemaDestination || './src/schema.graphql'),
      sortSchema: graphqlConfig.sortSchema,
      buildSchemaOptions: {
        numberScalarMode: 'integer',
      },
      // subscription
      installSubscriptionHandlers: true,
      includeStacktraceInErrorResponses: graphqlConfig.debug,
      playground: graphqlConfig.playgroundEnabled,

      formatError: (formattedError, error) => {
        // Log the complete error with context
        this.logger.error({
          err: error,
          msg: 'GraphQL error occurred',
          context: this.constructor.name,
          ...(error instanceof GraphQLError
            ? {
                originalError: error.originalError,
                path: error.path,
                locations: error.locations,
              }
            : {}),
        });

        // Log unknown errors
        if (error instanceof GraphQLError && !(error.originalError instanceof BaseError)) {
          this.logger.error({
            err: error.originalError || error,
            msg: 'GraphQL unknown error occurred',
            context: this.constructor.name,
          });
        }

        // @ts-expect-error allow assign
        formattedError.extensions ??= {};

        // Handle BaseError instances
        if (error instanceof GraphQLError && error.originalError instanceof BaseError) {
          return {
            message: error.originalError.getMessage('en'),
            extensions: {
              code: error.originalError.code,
            },
          };
        }

        return {
          message: 'Internal Server Error',
          extensions: {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            code: STATUS_CODES[HttpStatus.INTERNAL_SERVER_ERROR],
          },
        };
      },
      context: ({ req, res }) => ({ req, res }),
    };
  }
}

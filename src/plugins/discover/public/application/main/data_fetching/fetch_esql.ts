/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { pluck } from 'rxjs';
import { lastValueFrom } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { Query, AggregateQuery, Filter } from '@kbn/es-query';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { textBasedQueryStateToAstWithValidation } from '@kbn/data-plugin/common';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { RecordsFetchResponse } from '../../types';

interface EsqlErrorResponse {
  error: {
    message: string;
  };
  type: 'error';
}

export function fetchEsql(
  query: Query | AggregateQuery,
  dataView: DataView,
  data: DataPublicPluginStart,
  expressions: ExpressionsStart,
  inspectorAdapters: Adapters,
  abortSignal?: AbortSignal,
  filters?: Filter[],
  inputQuery?: Query
): Promise<RecordsFetchResponse> {
  const timeRange = data.query.timefilter.timefilter.getTime();
  return textBasedQueryStateToAstWithValidation({
    filters,
    query,
    time: timeRange,
    dataView,
    inputQuery,
    titleForInspector: i18n.translate('discover.inspectorEsqlRequestTitle', {
      defaultMessage: 'Table',
    }),
    descriptionForInspector: i18n.translate('discover.inspectorEsqlRequestDescription', {
      defaultMessage: 'This request queries Elasticsearch to fetch results for the table.',
    }),
  })
    .then((ast) => {
      if (ast) {
        const contract = expressions.execute(ast, null, {
          inspectorAdapters,
        });
        abortSignal?.addEventListener('abort', contract.cancel);
        const execution = contract.getData();
        let finalData: DataTableRecord[] = [];
        let esqlQueryColumns: Datatable['columns'] | undefined;
        let error: string | undefined;
        let esqlHeaderWarning: string | undefined;
        execution.pipe(pluck('result')).subscribe((resp) => {
          const response = resp as Datatable | EsqlErrorResponse;
          if (response.type === 'error') {
            error = response.error.message;
          } else {
            const table = response as Datatable;
            const rows = table?.rows ?? [];
            esqlQueryColumns = table?.columns ?? undefined;
            esqlHeaderWarning = table.warning ?? undefined;
            finalData = rows.map((row: Record<string, string>, idx: number) => {
              return {
                id: String(idx),
                raw: row,
                flattened: row,
              } as unknown as DataTableRecord;
            });
          }
        });
        return lastValueFrom(execution).then(() => {
          if (error) {
            throw new Error(error);
          } else {
            return {
              records: finalData || [],
              esqlQueryColumns,
              esqlHeaderWarning,
            };
          }
        });
      }
      return {
        records: [] as DataTableRecord[],
        esqlQueryColumns: [],
        esqlHeaderWarning: undefined,
      };
    })
    .catch((err) => {
      throw new Error(err.message);
    });
}

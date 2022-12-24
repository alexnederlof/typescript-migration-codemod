import * as t from '@babel/types';
import fs from 'fs-extra';
import * as recast from 'recast';
import * as recastFlowParser from 'recast/parsers/flow.js';
import recastOptions from '../recast_options.js';
import migrateToTypescript from './migrate_to_typescript.js';
import MigrationReporter from './migration_reporter.js';

export default async function processBatchAsync(
    reporter: MigrationReporter,
    filePaths: Array<string>,
) {
    await Promise.all(filePaths.map(async filePath => {
        try {
            const fileBuffer = await fs.readFile(filePath);

            const fileText = fileBuffer.toString('utf8');
            const file: t.File = recast.parse(fileText, {parser: recastFlowParser});
            const fileStats = {hasJsx: filePath.endsWith("jsx")};

            await migrateToTypescript(reporter, filePath, file, fileStats);

            // Write the migrated file to a temporary file since we’re just testing at the moment.
            const newFileTextWithFlowComment = recast.print(file, recastOptions).code;
            const newFileText = newFileTextWithFlowComment
                .replace(/\/\/ @flow.*\n+/, '')
                .replace(/\/\/ flow-disable-next-line/g, '// @ts-ignore');
            const tsFilePath = filePath.replace(/\.jsx?$/, fileStats.hasJsx ? '.tsx' : '.ts');
            await fs.writeFile(tsFilePath, newFileText);
        } catch (error) {
            reporter.reportError(filePath, error as Error)
        }
    }));
}

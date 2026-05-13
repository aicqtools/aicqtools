// A migration file. Must still be scanned by the default-exclude policy because rules like
// `camelcase-migration-column` depend on seeing migrations. Contains a console.log to make
// it easy to detect a hit in the test.
console.log('migration init');

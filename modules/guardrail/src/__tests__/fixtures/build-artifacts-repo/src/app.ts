// Single source file the runner should scan. The other dirs in this fixture are build
// artifacts that the default `exclude` list must filter out (alpha.7 expansion).
export function run(): void {
  console.log('app');
}

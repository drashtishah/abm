export interface CliArgs {
  model: string;
  ticks: number;
  config: string;
  batch: number;
  output: string;
  outputDir: string;
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    model: 'wolf-sheep',
    ticks: 1000,
    config: '{}',
    batch: 0,
    output: 'output.csv',
    outputDir: './runs',
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    switch (arg) {
      case '--model':
        if (next) args.model = next;
        i++;
        break;
      case '--ticks':
        if (next) args.ticks = parseInt(next, 10);
        i++;
        break;
      case '--config':
        if (next) args.config = next;
        i++;
        break;
      case '--batch':
        if (next) args.batch = parseInt(next, 10);
        i++;
        break;
      case '--output':
        if (next) args.output = next;
        i++;
        break;
      case '--output-dir':
        if (next) args.outputDir = next;
        i++;
        break;
    }
  }

  return args;
}

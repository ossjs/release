import pino from 'pino'

export const log = pino({
  base: null,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      timestampKey: false,
    },
  },
})

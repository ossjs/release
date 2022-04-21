import * as path from 'path'
import { config } from 'dotenv'

config({
  path: path.resolve(__dirname, './test/.env.test'),
})

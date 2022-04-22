import { Show } from '../../src/commands/show'
import { mockConfig } from '../fixtures'

it('exits given repository has no releases', async () => {
  const show = new Show(mockConfig())
  await show.run({ _: [] })
})

it.todo('exits given a non-existing tag')

it.todo('displays unpublished release info')

it.todo('displays public release info')

import { getNextVersion } from '../getNextVersion'

it('returns the correct patch next version', () => {
  expect(getNextVersion('0.0.0', 'patch')).toBe('0.0.1')
  expect(getNextVersion('0.1.0', 'patch')).toBe('0.1.1')
  expect(getNextVersion('1.1.0', 'patch')).toBe('1.1.1')
})

it('returns the correct minor next version', () => {
  expect(getNextVersion('0.0.0', 'minor')).toBe('0.1.0')
  expect(getNextVersion('0.2.0', 'minor')).toBe('0.3.0')
  expect(getNextVersion('1.0.0', 'minor')).toBe('1.1.0')
})

it('returns the correct major next version', () => {
  expect(getNextVersion('0.0.0', 'major')).toBe('1.0.0')
  expect(getNextVersion('0.1.0', 'major')).toBe('1.0.0')
  expect(getNextVersion('1.0.0', 'major')).toBe('2.0.0')
})

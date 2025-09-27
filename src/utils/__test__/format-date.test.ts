import { formatDate } from '#/src/utils/format-date.js'

it('formats a given date using "YYYY-MM-DD" mask', () => {
  expect(formatDate(new Date(2020, 0, 5))).toBe('2020-01-05')
  expect(formatDate(new Date(2020, 11, 15))).toBe('2020-12-15')
})

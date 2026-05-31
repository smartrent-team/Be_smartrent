import { format } from 'date-fns'

const date = new Date()
console.log("Local time format:", format(date, 'yyyyMMddHHmmss'))

const offset = 7 * 60 * 60 * 1000 // GMT+7
const tzDate = new Date(date.getTime() + offset)
console.log("If UTC, this would be GMT+7:", format(tzDate, 'yyyyMMddHHmmss'))

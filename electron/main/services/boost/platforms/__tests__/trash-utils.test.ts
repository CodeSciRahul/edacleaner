import { describe, expect, it } from 'vitest'
import { isBenignEmptyTrashError } from '../trash-utils'

describe('isBenignEmptyTrashError', () => {
  it('treats Finder already-empty messages as benign', () => {
    expect(
      isBenignEmptyTrashError(
        'Command failed: osascript -e tell application "Finder" to empty trash\n29:40: execution error: Finder got an error: The Trash is empty. (-15267)'
      )
    ).toBe(true)

    expect(
      isBenignEmptyTrashError(
        'execution error: Finder got an error: The Trash is already empty.'
      )
    ).toBe(true)
  })

  it('treats Windows Recycle Bin empty messages as benign', () => {
    expect(
      isBenignEmptyTrashError(
        'Clear-RecycleBin : The Recycle Bin is empty.\r\nAt line:1 char:1'
      )
    ).toBe(true)
  })

  it('does not treat permission / Finder unavailable as benign', () => {
    expect(
      isBenignEmptyTrashError(
        'Command failed: osascript -e tell application "Finder" to empty trash\n29:40: execution error: Finder got an error: Application isn\'t running. (-600)'
      )
    ).toBe(false)

    expect(
      isBenignEmptyTrashError(
        'Command failed: osascript -e tell application "Finder" to empty trash\nexecution error: Not authorized to send Apple events to Finder. (-1743)'
      )
    ).toBe(false)

    expect(
      isBenignEmptyTrashError(
        'Could not empty Trash (permission or Finder unavailable)'
      )
    ).toBe(false)
  })

  it('does not match the empty-trash command text alone', () => {
    expect(
      isBenignEmptyTrashError(
        'Command failed: osascript -e tell application "Finder" to empty trash'
      )
    ).toBe(false)
  })
})

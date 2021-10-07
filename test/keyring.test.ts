import { verifyMessage } from "@ethersproject/wallet"
import HDKeyring from "../src"

const validMnemonics = [
  "square time hurdle gospel crash uncle flash tomorrow city space shine sad fence ski harsh salt need edit name fold corn chuckle resource else",
  "until issue must",
  "glass skin grass cat photo essay march detail remain",
  "dream dinosaur poem cherry brief hand injury ice stuff steel bench vacant amazing bar uncover",
  "mad such absent minor vapor edge tornado wrestle convince shy battle region adapt order finish foot follow monitor",
]

const validDerivations = [
  {
    mnemonic:
      "square time hurdle gospel crash uncle flash tomorrow city space shine sad fence ski harsh salt need edit name fold corn chuckle resource else",
    addresses: [
      "0xca19be978a1d2456d16bde3efb0a5b8946f4a1ce",
      "0xce73b34e2cdf4e00054c509cc5fdf3882d4a87c8",
      "0x0b5446d680c0e665ee63508237337c8a9fe31361",
      "0x342097b215dacc397b7adc11eb54257f6bcb680e",
      "0x53e5caff572f5d16ae00054a77a252a636e56700",
      "0x17e02708eeaa9fc8c6ed86b08af1ea2e81cf18f9",
      "0x4a8d4ad7206c24a1c7e694760dbd35df33068401",
      "0x2d43d1f8f96ff679511209280617a146b049a999",
      "0xf260e5482cc567f04f42f6229b694f3a38721ed9",
      "0xcd29ee2e1fb20fa948451fb66316da280251c439",
    ],
  },
  {
    mnemonic:
      "brain surround have swap horror body response double fire dumb bring hazard",
    addresses: [
      "0x7b4322b9abe447ce86faa6121b35c84ec36945ad",
      "0x33a77a26b8523bf21bfd63f81c77f495627304e3",
      "0x2614fdc904520631f0a24ac3360393e48359fe78",
      "0xd317dcc257bedf8868b8b41a3f053604e08d3618",
      "0x0b87d62bec983a9d7832f560377e8a0876fba9cc",
      "0x6208e7af335ea9422e703b1e688b0e7f17a44a87",
      "0x74502255857e5fc38945cd6391818726fd9117e5",
      "0xc3c542dd8057f1c4a92e0bf6aa0248ed37825472",
      "0xa20ac021efb093f7f56d1e2cff31cca1c6ecac02",
      "0x260268b1cb9f4b9f6269d6051300057e3a8e1cb5",
    ],
  },
]

const twelveOrMoreWordMnemonics = validMnemonics.filter(
  (m) => m.split(" ").length >= 12,
)

const underTwelveWorkMnemonics = validMnemonics.filter(
  (m) => m.split(" ").length < 12,
)

describe("HDKeyring", () => {
  it("can be constructed without a mnemonic", () => {
    const keyring = new HDKeyring()
    expect(keyring.id).toBeTruthy()
    expect(keyring.id.length).toBeGreaterThan(9)
  })
  it("can be constructed with a mnemonic", () => {
    const keyring = new HDKeyring({
      mnemonic: validMnemonics[0],
    })
    expect(keyring.id).toBeTruthy()
    expect(keyring.id.length).toBeGreaterThan(9)
  })
  it("cannot be constructed with an invalid mnemonic", () => {
    underTwelveWorkMnemonics.forEach((m) =>
      expect(() => new HDKeyring({ mnemonic: m })).toThrowError(),
    )
  })
  it("serializes its mnemonic", () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring = new HDKeyring({ mnemonic: m })
      const serialized = await keyring.serialize()
      expect(serialized.mnemonic).toBe(m)
    })
  })
  it("deserializes after serializing", () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring = new HDKeyring({ mnemonic: m })
      const id1 = keyring.id

      const serialized = await keyring.serialize()
      const deserialized = HDKeyring.deserialize(serialized)

      expect(id1).toBe(deserialized.id)
    })
  })
  it("fails to deserialize different versions", () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring = new HDKeyring({ mnemonic: m })
      const serialized = await keyring.serialize()
      serialized.version = 2
      expect(() => HDKeyring.deserialize(serialized)).toThrowError()
    })
  })
  it("generates the same IDs from the same mnemonic", async () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring1 = new HDKeyring({ mnemonic: m })
      const keyring2 = new HDKeyring({ mnemonic: m })

      expect(keyring1.id).toBe(keyring2.id)
    })
  })
  it("generates distinct accounts", async () => {
    const allAddresses: string[] = []
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring = new HDKeyring({ mnemonic: m })

      await keyring.addAddresses(10)

      const accounts = await keyring.getAddresses()
      expect(accounts.length).toEqual(10)
      expect(new Set(accounts).size).toEqual(10)

      allAddresses.concat(accounts)
    })
    expect(new Set(allAddresses).size).toEqual(allAddresses.length)
  })
  it("generates the same accounts from the same mnemonic", async () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring1 = new HDKeyring({ mnemonic: m })
      const keyring2 = new HDKeyring({ mnemonic: m })

      keyring1.addAddressesSync()
      keyring2.addAddressesSync()

      expect((await keyring1.getAddresses()).length).toBeGreaterThan(0)
      expect((await keyring2.getAddresses()).length).toBeGreaterThan(0)

      expect(await keyring1.getAddresses()).toStrictEqual(
        await keyring2.getAddresses(),
      )
    })
  })
  it("derives the same addresses as legacy wallets", async () => {
    validDerivations.forEach(async ({ mnemonic, addresses }) => {
      const keyring = new HDKeyring({ mnemonic })
      await keyring.addAddressesSync(10)
      const newAddresses = keyring.getAddressesSync()
      expect(newAddresses).toStrictEqual(addresses)
    })
  })
  it("signs messages recoverably", async () => {
    twelveOrMoreWordMnemonics.forEach(async (m) => {
      const keyring = new HDKeyring({ mnemonic: m })

      const accounts = await keyring.addAddresses(2)
      accounts.forEach(async (address) => {
        const message = "recoverThisMessage"
        const sig = await keyring.signMessage(address, message)
        expect(await verifyMessage(message, sig).toLowerCase()).toEqual(address)
      })
    })
  })
  it.todo("signs transactions recoverably")
  it.todo("signs typed data recoverably")
})

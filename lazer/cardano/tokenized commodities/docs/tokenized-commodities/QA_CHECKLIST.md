# Tokenized Commodities — QA Checklist
- [ ] Health endpoint responds
- [ ] Manifest exposes correct thesis and exclusions
- [ ] Quote returns QUOTE when oracle is usable and collateral is sufficient
- [ ] Quote returns DISPUTE when oracle is stale without fallback
- [ ] Prepare-settlement returns tx draft
- [ ] Bigint values are serialized as strings
- [ ] Frontend presets work

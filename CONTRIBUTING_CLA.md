# Contributor License Agreement (CLA)

Thank you for your interest in contributing to Vulpes Celare!

By contributing to Vulpes Celare, you agree to the following terms:

## Copyright and License

1. **You retain copyright** to your contributions.

2. **You grant a dual license** to your contributions:
   - **To the community**: AGPL-3.0 (same as the project)
   - **To the project maintainer** (DocHatty): The right to sublicense 
     under commercial terms for organizations that require it

3. **Why dual license?**
   - Ensures the project can offer commercial licenses to enterprises
   - Allows project sustainability through commercial licensing revenue
   - Your contributions remain AGPL-3.0 for the open source community
   - Enables ongoing development and maintenance

## What This Means for You

✅ Your code stays open source (AGPL-3.0)  
✅ Community can use your contributions freely  
✅ You get credit for your work in commits and contributors list  
✅ The project can sell commercial licenses to enterprises (funding development)  
✅ You can fork and use under AGPL-3.0 terms

## What This Means for Your Contributions

Your contributions will be:
- **Publicly visible** under AGPL-3.0
- **Available to everyone** for free (under AGPL terms)
- **Included in commercial licenses** sold to enterprises (with your copyright intact)
- **Properly attributed** to you in version control

## Certification

By submitting a contribution, you certify that:

1. You have the right to submit the contribution under these terms
2. You grant the licenses described above
3. You understand contributions are public and will remain so
4. Your contribution is your original work or you have rights to submit it
5. You have not copied code from incompatible licenses

## How to Sign

Add this line to your commit messages:

```
Signed-off-by: Your Name <your-email@example.com>
```

This indicates you agree to the CLA.

### Example Commit:

```bash
git commit -m "Add OCR error detection for dates

Improved date detection to handle common OCR errors like O/0 confusion.

Signed-off-by: Jane Smith <jane@example.com>"
```

## Git Configuration

Configure git to automatically add sign-off:

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# Then use -s flag when committing:
git commit -s -m "Your commit message"
```

## Questions?

If you have questions about the CLA:
- Open an issue on GitHub
- Label it with `question` and `CLA`
- We'll respond within 24-48 hours

## Why This Approach?

Many successful open source projects use dual licensing:
- **MySQL**: GPL + Commercial
- **Qt**: GPL + Commercial  
- **MongoDB**: SSPL + Commercial
- **Grafana**: AGPL + Commercial

This model:
- ✅ Keeps the code open and auditable (critical for healthcare)
- ✅ Allows free use for researchers, students, small organizations
- ✅ Funds continued development through enterprise licensing
- ✅ Ensures long-term project sustainability

## Alternative: Small Contributions

For **minor contributions** (typo fixes, small documentation updates, etc.), 
the CLA is implicitly accepted through GitHub's Terms of Service. 

This CLA is primarily for **substantial code contributions** that add features 
or modify core functionality.

## Thank You!

Your contributions help make PHI redaction more accessible, transparent, and 
secure for the entire healthcare community. We appreciate your support! 🙏

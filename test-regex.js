// Utility script to test resume path matching regex
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const filename = "victim.pdf";
const escapedFilename = escapeRegex(filename);
const regex = new RegExp(`\/${escapedFilename}$`);
console.log(regex.test("/api/files/resumes/victim.pdf")); // true
console.log(regex.test("/api/files/resumes/my-victim.pdf")); // false

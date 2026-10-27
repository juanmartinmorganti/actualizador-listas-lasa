const readline = require("node:readline");
const { hashPassword } = require("../auth");

const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
terminal.stdoutMuted = true;
terminal._writeToOutput = function (text) {
  if (!this.stdoutMuted) this.output.write(text);
};
process.stdout.write("Contraseña de administración (mínimo 12 caracteres): ");
terminal.question("", (password) => {
  terminal.stdoutMuted = false;
  process.stdout.write("\n");
  terminal.close();
  if (password.length < 12) {
    console.error("Usá una contraseña de al menos 12 caracteres.");
    process.exitCode = 1;
    return;
  }
  console.log(hashPassword(password));
});

export const getProjectRoot = () => {
    return process.env.ZENCODE_CWD || process.cwd();
};

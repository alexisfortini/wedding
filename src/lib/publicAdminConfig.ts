// Public UI defaults contain no credentials. Admin verification happens on the server.
const publicAdminConfig: { admins: { first: string; last: string }[]; passcode: string } = { admins: [], passcode: "" };
export default publicAdminConfig;

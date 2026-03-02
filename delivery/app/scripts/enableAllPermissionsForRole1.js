// enableAllPermissionsForRole1.js
// Assigns all permissions to role_id 1

const db = require("../models");
const Permission = db.permissions;
const RolePermission = db.role_permissions;

const ROLE_ID = 1;

(async () => {
  const permissions = await Permission.findAll({ attributes: ["id"] });
  let created = 0;
  let skipped = 0;

  for (const perm of permissions) {
    const existing = await RolePermission.findOne({
      where: {
        role_id: ROLE_ID,
        permission_id: perm.id,
      },
    });

    if (!existing) {
      await RolePermission.create({
        role_id: ROLE_ID,
        permission_id: perm.id,
      });
      created++;
      console.log(`✅ Assigned permission_id ${perm.id} to role_id ${ROLE_ID}`);
    } else {
      skipped++;
      console.log(`✔️ Already assigned: permission_id ${perm.id}`);
    }
  }

  console.log(`\nDone. Created: ${created}, Already existed: ${skipped}, Total permissions: ${permissions.length}`);
  process.exit();
})();

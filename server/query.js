const { Op } = require('sequelize');
const WaStore = require('./models/WaStore');

async function check() {
  const stores = await WaStore.findAll({
    where: { customDomain: { [Op.iLike]: '%amardryfruit%' } },
    attributes: ['id', 'customDomain', 'isActive', 'domainStatus']
  });
  console.log(stores.map(s => s.toJSON()));
  process.exit(0);
}
check().catch(console.error);

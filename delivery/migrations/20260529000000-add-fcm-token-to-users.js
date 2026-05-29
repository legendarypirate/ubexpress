'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.fcm_token) {
      await queryInterface.addColumn('users', 'fcm_token', {
        type: Sequelize.STRING(512),
        allowNull: true,
      });
    }

    if (!tableDescription.fcm_platform) {
      await queryInterface.addColumn('users', 'fcm_platform', {
        type: Sequelize.STRING(32),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.fcm_platform) {
      await queryInterface.removeColumn('users', 'fcm_platform');
    }
    if (tableDescription.fcm_token) {
      await queryInterface.removeColumn('users', 'fcm_token');
    }
  },
};

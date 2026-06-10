module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define("user", {
      username: {
        type: Sequelize.STRING
      },
      password: {
        type: Sequelize.STRING
      },
      role_id: {
        type: Sequelize.INTEGER
      },
      phone: {
        type: Sequelize.STRING
      },
 contact_info: {
        type: Sequelize.STRING,
        allowNull: true

      },
      email: {
        type: Sequelize.STRING
      },
      bank: {
        type: Sequelize.STRING,
        allowNull: true
      },
      account_number: {
        type: Sequelize.STRING,
        allowNull: true
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      report_price: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 7000
      },
      fcm_token: {
        type: Sequelize.STRING(512),
        allowNull: true,
      },
      fcm_platform: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      api_key: {
        type: Sequelize.STRING(64),
        allowNull: true,
        unique: true,
      },
    });
    return User;
  };
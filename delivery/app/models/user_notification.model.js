module.exports = (sequelize, Sequelize) => {
  const UserNotification = sequelize.define("user_notification", {
    user_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    title: {
      type: Sequelize.STRING(255),
      allowNull: false,
    },
    body: {
      type: Sequelize.TEXT,
      allowNull: false,
    },
    type: {
      type: Sequelize.STRING(64),
      allowNull: true,
      defaultValue: "general",
    },
    data: {
      type: Sequelize.TEXT,
      allowNull: true,
    },
    read_at: {
      type: Sequelize.DATE,
      allowNull: true,
    },
  });

  return UserNotification;
};

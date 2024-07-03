var express = require('express');
var router = express.Router();
const upload = require('./multer');
const userModel = require('./users');
const postModel = require('./posts');
const storyModel = require('./story');
const commentModel = require('./comment');
const notificationModel = require('./notification');
const messageModel = require('./message');
const passport = require('passport');
const localStrategy = require('passport-local');
const { trusted } = require('mongoose');

passport.use(new localStrategy(userModel.authenticate()));

function timeDiffer(date) {
  const now = new Date();
  const diff = now - date;

  // Convert milliseconds to seconds
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d`;
  }

  const weeks = Math.floor(days / 7);

  return `${weeks}w`;
}

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  };
  res.redirect("/");
}

router.post('/register', function (req, res, next) {
  const user = new userModel({
    username: req.body.username,
    email: req.body.email,
    name: req.body.name
  })

  userModel.register(user, req.body.password)
    .then(function (registerdUser) {
      passport.authenticate("local")(req, res, function () {
        res.redirect('/profile')
      })
    })
})

router.post('/login', passport.authenticate("local", {
  successRedirect: '/profile',
  failureRedirect: '/login'
}), function (req, res, next) { })

router.post('/uploadPfP', isLoggedIn, upload.single('image'), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  user.profileImg = req.file.filename;
  await user.save();
  res.redirect('/edit');
})
router.post('/upload', isLoggedIn, upload.single('image'), async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (req.body.category === 'post') {
    const post = await postModel.create({
      caption: req.body.caption,
      user: user._id,
      postImg: req.file.filename,
    });

    user.postId.push(post._id);
  } else {
    const story = await storyModel.create({
      user: user._id,
      storyImg: req.file.filename,
    });
    user.stories.push(story._id);
  }
  await user.save();
  res.redirect('/feed');
})

router.post('/edit', isLoggedIn, async function (req, res) {
  await messageModel.updateMany({ sender: req.session.passport.user }, { sender: req.body.username });
  await messageModel.updateMany({ reciever: req.session.passport.user }, { reciever: req.body.username });
  const user = await userModel.findOneAndUpdate({ username: req.session.passport.user }, { username: req.body.username, bio: req.body.bio, name: req.body.name }, { new: true });
  req.login(user, function (err) {
    if (err) throw err;
    res.redirect("/profile");
  });
});

router.post('/comments/:postid', isLoggedIn, async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postid });
  const postUser = await userModel.findOne({ _id: post.user });
  const user = await userModel.findOne({ username: req.session.passport.user });
  const Notification = await notificationModel.create({
    post: post._id,
    fromUser: user._id,
    toUser: postUser._id,
  });
  const newComment = await commentModel.create({
    user: user._id,
    comment: req.body.comment
  })
  if (req.body.type && req.body.type !== 'comment') {
    const comments = await commentModel.findOne({ _id: req.body.type });
    comments.reply.push(newComment._id);
    await comments.save();
    Notification.content = `${user.username} replied - ${req.body.comment} on your comment - ${comments.comment}.`;
  } else {
    post.comment.push(newComment._id);
    await post.save();
    Notification.content = `${user.username} commented - ${req.body.comment} on your post.`;
  }
  await Notification.save();
  postUser.notifications.push(Notification._id)
  await postUser.save();
  res.redirect(`/comments/${req.params.postid}`);
});

// get -------------------------------


router.get('/notifications', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate({ path: 'notifications', populate: [{ path: 'fromUser' }, { path: 'post' }] });
  await notificationModel.updateMany({ toUser: user._id, seen: false }, { seen: true });
  res.render('notification', { user, footer: true })
})

router.get('/logout', isLoggedIn, function (req, res, next) {
  req.logout(function (err) {
    if (err) { return next(err); }
    res.redirect('/');
  });
});

router.get('/reply/:commentId', isLoggedIn, async function (req, res, next) {

  const comment = await commentModel.findById(req.params.commentId).populate({ path: 'reply', populate: { path: 'user' } });
  res.json(comment.reply);

})

router.get('/user/:user/:type', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate(req.params.type);
  const otherUser = await userModel.findByUsername(req.params.user).populate(req.params.type);

  const uniqueUsers = otherUser[req.params.type].filter(otherUsers => !(user.following.some(item => item._id.equals(otherUsers._id))));

  const commonUsers = otherUser[req.params.type].filter(otherUsers => user.following.some(item => item._id.equals(otherUsers._id)));

  res.render('list', { commonUsers, uniqueUsers, user, otherUser, basis: req.params.type, footer: true });

})

router.get('/clear', async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  await notificationModel.deleteMany({ toUser: user._id })
  user.notifications = [];
  await user.save();
  res.redirect('/notifications');
});


router.get('/', async function (req, res) {
  res.render('index', { footer: false });
});

router.get('/comments/:postid', isLoggedIn, async function (req, res) {
  let post = await postModel.findOne({ _id: req.params.postid }).populate({ path: 'comment', populate: { path: 'user' } });
  const user = await userModel.findOne({ username: req.session.passport.user });
  const comments = post.comment.map(comment => ({ ...comment.toObject(), date: timeDiffer(comment.date) }));
  res.render('comment', { footer: false, comments, user, postId: post._id });
});

router.get('/like/:postId', async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postId });
  const postUser = await userModel.findOne({ _id: post.user });
  const user = await userModel.findOne({ username: req.session.passport.user });
  const notification = await notificationModel.findOne({ content: `${user.username} liked your post.`, post: post._id, fromUser: user._id })
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
    if (!(postUser._id.equals(user._id))) {
      const Notification = await notificationModel.create({
        post: post._id,
        fromUser: user._id,
        toUser: postUser._id,
        content: `${user.username} liked your post.`
      })
      postUser.notifications.push(Notification._id)
      await postUser.save();
    }
  } else {
    if (notification) {
      await notificationModel.findOneAndDelete({ _id: notification._id });
      postUser.notifications.splice(postUser.notifications.indexOf(notification._id), 1);
    }
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.json({ post, user });
});
router.get('/save/:postId', async function (req, res) {
  const post = await postModel.findOne({ _id: req.params.postId });
  const user = await userModel.findOne({ username: req.session.passport.user });
  if (user.savePost.indexOf(post._id) === -1) {
    user.savePost.push(post._id);
  } else {
    user.savePost.splice(user.savePost.indexOf(post._id), 1);
  }
  await user.save();
  res.json(user);
});

router.get('/login', function (req, res) {
  res.render('login', { footer: false });
});


router.get('/feed', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('stories').populate('notifications').populate('following');
  let seen = true ;
  let msgSeen = true;

  if (await notificationModel.findOne({ toUser: user._id, seen: false })) {
    seen = false;
  }
  if (await messageModel.findOne({ reciever: user.username, seen: false })) msgSeen = false;



  const Allpost = await postModel.find().populate('user')
  const posts = Allpost.map(post => ({ ...post.toObject(), date: timeDiffer(post.date), likes: post.likes.map(id => id.toString()) }));
  const story = await storyModel.find({ user: { $ne: user._id } }).populate('user')
  const stors = story.map(story => ({ ...story.toObject(), date: timeDiffer(story.date) }));
  var uniq = {};
  var stories = stors.filter(item => {
    if (!uniq[item.user.id]) {
      uniq[item.user.id] = " ";
      return true;
    }
    else return false;
  })
  res.render('feed', { footer: true, posts, user, stories, seen, msgSeen });
});

router.get('/saved', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('savePost');

  res.render('SavedPost', { footer: true, posts: user.savePost, user });
});

router.get('/openPost/:postid', async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.findOne({ _id: req.params.postid }).populate('user');
  var date = timeDiffer(post.date)

  res.render('openPost', { footer: true, post, date, user });
})

router.get('/messages', isLoggedIn, async function (req, res, next) {
  let user = await userModel.findOne({ username: req.session.passport.user }).populate('following');
  let displayUser;
  if (req.user.messagedUser.length === 0) {
    user = await user.populate('following');
    displayUser = user.following;
  } else {
    user = await user.populate('messagedUser');
    displayUser = user.messagedUser;
  }

  res.render('message', { footer: true, user, displayUser });
})


router.get('/openChat/:chatUser', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const chatUser = await userModel.findOne({ username: req.params.chatUser });

  const messages = await messageModel.find({
    $or: [{
      sender: user.username,
      reciever: chatUser.username
    }, {
      sender: chatUser.username,
      reciever: user.username
    }]
  }).populate({ path: 'post', populate: { path: 'user' } });



  await messageModel.updateMany({ seen: false, reciever: user.username, sender: chatUser.username }, { seen: true });

  res.render('chatting', { footer: false, user, chatUser, messages });
})

router.get('/send/:username/:post', isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const chatUser = await userModel.findOne({ username: req.params.username });
  const post = await postModel.findOne({ _id: req.params.post });

  if (!user.messagedUser.includes(chatUser._id)) {
    user.messagedUser.push(chatUser._id);
    await user.save();
  }
  if (!chatUser.messagedUser.includes(user._id)) {
    chatUser.messagedUser.push(user._id);
    await chatUser.save();
  }
  await messageModel.create({
    sender: user.username,
    reciever: req.params.username,
    post: post._id,
  })
  res.status(200).json('done');

})



router.get('/story/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const storyUser = await userModel.findOne({ _id: req.params.id }).populate('stories');
  const modifiedStoryUser = { ...storyUser.toObject() };
  modifiedStoryUser.stories = modifiedStoryUser.stories.map(story => ({ ...story, date: timeDiffer(story.date) }));
  res.render('story', { footer: true, storyUser: modifiedStoryUser, user });
})

router.get('/profile', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate('postId').populate('notifications');
  let seen = true;
  user.notifications.some(notif => {
    if (notif.seen === false) {
      seen = false;
      return true;
    }
  }
  )
  res.render('profile', { footer: true, user, seen });
});
router.get('/profile/:username', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const otherUser = await userModel.findOne({ username: req.params.username }).populate('postId');
  if (user.username === otherUser.username) {
    res.redirect('/profile');
  }
  res.render('otherProfile', { footer: true, user, otherUser });
});
router.get('/follow/:id', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const otherUser = await userModel.findOne({ _id: req.params.id });
  const notif = await notificationModel.findOne({
    fromUser: user._id,
    toUser: otherUser._id,
    content: `${user.username} started following you.`
  })

  if (user.following.indexOf(otherUser._id) === -1) {
    user.following.push(req.params.id);
    otherUser.followers.push(user._id);
    if (!user._id.equals(otherUser._id)) {
      const Notification = await notificationModel.create({
        fromUser: user._id,
        toUser: otherUser._id,
        content: `${user.username} started following you.`
      });
      otherUser.notifications.push(Notification);
      await otherUser.save();
    }
  } else {
    if (notif) {
      otherUser.notifications.splice(otherUser.notifications.indexOf(notif._id), 1);
      await notificationModel.deleteOne({ _id: notif._id });
    }
    user.following.splice(user.following.indexOf(otherUser._id), 1);
    otherUser.followers.splice(otherUser.followers.indexOf(user._id), 1);
  }
  await user.save();
  await otherUser.save();
  res.redirect('back');
});

router.get('/search', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('search', { footer: true, user });
});
router.get('/search/:username', isLoggedIn, async function (req, res) {
  const query = { username: { $regex: new RegExp('^' + `${req.params.username}`, 'i') } };
  const user = await userModel.find(query)
  res.json(user)
});

router.get('/edit', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('edit', { footer: true, user });
});

router.get('/upload', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render('upload', { footer: true, user });
});

module.exports = router;

import React, { useState, Fragment } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';
import { useMoviesDataById } from '../api/video';
// import VideoPlayer from '../components/VideoPlayer';

const VideoScreen = () => {
  // const route = useRoute();
  // const { id } = route.params;
  // const navigation = useNavigation();

  const [playing, setPlaying] = useState(false);
  // const [activeEpisode, setActiveEpisode] = useState<any>(null);

  const { data } = useMoviesDataById('cmffbkeif0001s60e281b9ksg');
  console.log('data', data);

  // const date = new Date(data?.movie?.createdAt);
  // const year = date.getUTCFullYear();

  // useEffect(() => {
  //   setActiveEpisode(data?.movie?.episodes?.[0]);
  // }, [data, isFetching]);

  // const handlerCreator = (i = 1) => {
  //   navigation.navigate(
  //     'Creator' as never,
  //     { id: data?.movie?.uploader?.id } as never,
  //   );
  // };

  return (
    <View>
      <View style={styles.frame}>
        {/* <View style={styles.videoWrapper}> */}
        {/* <VideoPlayer
            episode={activeEpisode ?? data?.movie?.episodes?.[0]}
            movie={data?.movie}
            playing={playing}
            setPlaying={setPlaying}
          /> */}
        {/* </View> */}

        <ScrollView
          style={[styles.rightSection, playing && { opacity: 0.3 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.movieInfo}>
            <View style={styles.content}>
              <View style={styles.above}>
                <View style={styles.videoQuality}>
                  <Text style={styles.episode}>
                    10
                    {/* Episode {activeEpisode?.episodeNo} */}
                  </Text>
                  <Text style={styles.year}>{2025}</Text>
                  <View style={styles.quality}>
                    <Text style={styles.hd}>HD</Text>
                  </View>
                </View>
                <View style={styles.lable}>
                  <Text style={styles.title}>
                    {/* {activeEpisode?.title} */} title
                  </Text>
                </View>
                <Text style={styles.description}>
                  {/* {activeEpisode?.description} */} description
                </Text>
              </View>
            </View>

            {/* <View style={styles.genres}>
              <View style={styles.creator}>
                <Text style={styles.by}>By</Text>
                <TouchableOpacity
                  onPress={() => handlerCreator()}
                  style={styles.infoCta}
                >
                  <View style={styles.avatarWrapper}>
                    <Image
                      source={{
                        uri:
                          data?.movie?.uploader?.profiles?.[0]?.avatarUrl ??
                          'https://via.placeholder.com/24',
                      }}
                      style={styles.avatar}
                    />
                  </View>
                  <Text style={styles.name}>{data?.movie?.uploader?.name}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.genresText}>
                Genres: {data?.movie?.genres.map((g: any) => g.name).join(', ')}
              </Text>
            </View> */}
          </View>

          {/* {data?.movie?.episodes?.length > 0 && (
            <View style={styles.div}>
              <Text style={styles.episodeTitle}>Episodes</Text>
              {data?.movie?.episodes?.map((e: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.episodeBox,
                    activeEpisode?.title === e.title && styles.activeEpisodeBox,
                  ]}
                >
                  <View style={styles.innerContent}>
                    <View style={styles.numberWrapper}>
                      <Text style={styles.number}>{e.episodeNo}</Text>
                      <TouchableOpacity
                        style={[styles.movieCard, { backgroundColor: '#333' }]}
                        onPress={() => !playing && setActiveEpisode(e)}
                      >
                        <View style={styles.ellipse}>
                          <ButtonPlay width={13} height={13} />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.textWrapper}>
                      <View style={styles.offerWrapper}>
                        <Text style={styles.offerText}>{e.title}</Text>
                        <Text style={styles.minute}>{e.duration} m</Text>
                      </View>
                      <Text style={styles.largeText}>{e.description}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )} */}
        </ScrollView>
      </View>
    </View>
  );
};

export default VideoScreen;

const styles = StyleSheet.create({
  frame: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 20,
    margin: 'auto',
    paddingBottom: 20,
  },
  videoWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    maxWidth: 755,
  },
  movieInfo: {
    backgroundColor: 'rgba(9,9,9,0.28)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'column',
    gap: 12,
  },
  above: {
    flexDirection: 'column',
    gap: 14,
  },
  videoQuality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episode: {
    fontSize: 16,
    color: '#bcbcbc',
  },
  year: {
    fontSize: 16,
    color: '#bcbcbc',
  },
  quality: {
    borderWidth: 1,
    borderColor: '#808080',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  hd: {
    fontSize: 11,
    color: '#e5e5e5',
  },
  lable: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  description: {
    fontSize: 14,
    color: '#fff',
  },
  genres: {
    marginTop: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 0,
  },
  creator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  avatarWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  name: {
    fontSize: 12,
    color: '#fff',
  },
  by: {
    fontSize: 14,
    color: '#777',
  },
  genresText: {
    fontSize: 14,
    color: '#fff',
  },
  div: {
    backgroundColor: 'rgba(9,9,9,0.28)',
    borderRadius: 15,
    padding: 20,
    gap: 16,
  },
  episodeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  episodeBox: {
    padding: 20,
  },
  activeEpisodeBox: {
    backgroundColor: '#222',
  },
  innerContent: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 14,
  },
  numberWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  number: {
    fontSize: 18,
    color: '#dcdcdc',
    width: 50,
    textAlign: 'center',
  },
  movieCard: {
    width: 100,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipse: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrapper: {
    flexDirection: 'column',
    gap: 8,
    flex: 1,
  },
  offerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  offerText: {
    fontSize: 16,
    color: '#fff',
  },
  minute: {
    fontSize: 16,
    color: '#fff',
  },
  largeText: {
    fontSize: 14,
    color: '#d2d2d2',
  },
});

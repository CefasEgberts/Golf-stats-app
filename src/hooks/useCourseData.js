import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TEE_COLOR_ORDER } from '../lib/constants';

export const useCourseData = () => {
  const [courseRating, setCourseRating] = useState(null);
  const [allHolesData, setAllHolesData] = useState([]);
  const [dbHoleData, setDbHoleData] = useState(null);
  const [loadingHoleData, setLoadingHoleData] = useState(false);
  const [googleCourses, setGoogleCourses] = useState([]);
  const [nearbyCoursesLoading, setNearbyCoursesLoading] = useState(false);

  const fetchAvailableTees = async (courseName, loopName) => {
    try {
      const loopId = loopName.toLowerCase();
      const firstWord = courseName.toLowerCase().split(' ')[0];
      const { data } = await supabase
        .from('golf_holes')
        .select('distances')
        .ilike('course_id', '%' + firstWord + '%')
        .eq('loop_id', loopId)
        .eq('hole_number', 1)
        .single();
      if (data?.distances) {
        return Object.keys(data.distances)
          .filter(k => data.distances[k] > 0)
          .sort((a, b) => TEE_COLOR_ORDER.indexOf(a) - TEE_COLOR_ORDER.indexOf(b))
          .map(k => k.charAt(0).toUpperCase() + k.slice(1));
      }
      return null;
    } catch (err) {
      console.error('Error fetching tees:', err);
      return null;
    }
  };

  const fetchCourseRating = async (courseName, loopName, gender, teeColor, isCombo, comboId) => {
    try {
      const loopId = loopName.toLowerCase();
      const firstWord = courseName.toLowerCase().split(' ')[0];
      let data, error;
      if (isCombo && comboId) {
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .eq('combo_id', comboId)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data; error = result.error;
      } else {
        const result = await supabase
          .from('course_ratings')
          .select('*')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .is('combo_id', null)
          .eq('gender', gender)
          .eq('tee_color', teeColor.toLowerCase())
          .single();
        data = result.data; error = result.error;
      }
      if (data) { setCourseRating(data); }
      else { console.log('No course rating found:', error?.message); setCourseRating(null); }
    } catch (err) {
      console.error('Error fetching course rating:', err);
      setCourseRating(null);
    }
  };

  const fetchAllHolesForLoop = async (courseName, loopName, isCombo, comboId) => {
    try {
      if (isCombo && comboId) {
        const { data } = await supabase
          .from('combo_stroke_index')
          .select('hole_number, stroke_index_men, stroke_index_ladies, source_loop')
          .eq('combo_id', comboId)
          .order('hole_number');
        if (data?.length > 0) {
          const enrichedData = await Promise.all(data.map(async (hole) => {
            const firstWord = courseName.toLowerCase().split(' ')[0];
            const { data: holeData } = await supabase
              .from('golf_holes')
              .select('par')
              .ilike('course_id', '%' + firstWord + '%')
              .eq('loop_id', hole.source_loop)
              .eq('hole_number', hole.hole_number <= 9 ? hole.hole_number : hole.hole_number - 9)
              .single();
            return { ...hole, par: holeData?.par || 4 };
          }));
          setAllHolesData(enrichedData);
        } else {
          setAllHolesData([]);
        }
      } else {
        const loopId = loopName.toLowerCase();
        const firstWord = courseName.toLowerCase().split(' ')[0];
        const { data } = await supabase
          .from('golf_holes')
          .select('hole_number, par, stroke_index_men, stroke_index_ladies')
          .ilike('course_id', '%' + firstWord + '%')
          .eq('loop_id', loopId)
          .order('hole_number');
        setAllHolesData(data?.length > 0 ? data : []);
      }
    } catch (err) {
      console.error('Error fetching all holes:', err);
      setAllHolesData([]);
    }
  };

  const fetchHoleFromDatabase = async (courseName, loopName, holeNumber) => {
    setLoadingHoleData(true);
    setDbHoleData(null);
    try {
      const loopId = loopName.toLowerCase();
      const courseId = courseName.toLowerCase().replace(/\s+/g, '-') + '-' + loopId;
      let { data, error } = await supabase
        .from('golf_holes').select('*')
        .eq('course_id', courseId).eq('loop_id', loopId).eq('hole_number', holeNumber).single();
      if (error || !data) {
        const firstWord = courseName.toLowerCase().split(' ')[0];
        const result = await supabase
          .from('golf_holes').select('*')
          .ilike('course_id', '%' + firstWord + '%').eq('loop_id', loopId).eq('hole_number', holeNumber).single();
        data = result.data; error = result.error;
      }
      if (error || !data) {
        const result = await supabase
          .from('golf_holes').select('*')
          .eq('loop_id', loopId).eq('hole_number', holeNumber).single();
        data = result.data; error = result.error;
      }
      if (data) { setDbHoleData(data); }
      else { console.log('No hole data found:', error?.message); setDbHoleData(null); }
    } catch (err) {
      console.error('Error fetching hole data:', err);
      setDbHoleData(null);
    } finally {
      setLoadingHoleData(false);
    }
  };

  const searchCoursesInDatabase = async (query) => {
    if (!query || query.length < 2) { setGoogleCourses([]); return; }
    try {
      const { data: courses, error } = await supabase
        .from('golf_courses').select('*')
        .or(`name.ilike.%${query}%,city.ilike.%${query}%`).limit(20);
      if (error) throw error;
      if (courses) {
        setGoogleCourses(courses.map(c => ({
          id: c.id, name: c.name, city: c.city,
          loops: c.loops, teeColors: c.tee_colors,
          lat: parseFloat(c.latitude), lng: parseFloat(c.longitude), distance: '--'
        })));
      }
    } catch (error) {
      console.error('Error searching courses:', error);
    }
  };

  return {
    courseRating, allHolesData, dbHoleData, loadingHoleData,
    googleCourses, setGoogleCourses, nearbyCoursesLoading, setNearbyCoursesLoading,
    fetchAvailableTees, fetchCourseRating, fetchAllHolesForLoop,
    fetchHoleFromDatabase, searchCoursesInDatabase
  };
};
